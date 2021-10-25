import { QueryType } from "discord-player";
import { Client, Message, MessageEmbed } from "discord.js";
import ms from "ms";
import { player } from "../index";
import type { Command } from "../type";
import { musicPermissions } from "../type";

export const ping: Command = {
	name: "ping",
	aliases: ["pong"],
	description: "You can ping, lmao",
	group: "ping",
	owner: false,
	voiceChannel:false,
	async execute(message: Message, client: Client, args: string[]) {
		message.channel.send({
			embeds: [
				new MessageEmbed()
					.setAuthor(`Pinging`),
			],
		}).then(async m => {
			// The math thingy to calculate the user's ping
			let ping = m.createdTimestamp - message.createdTimestamp;
			
			// Basic embed
			
			let embed = new MessageEmbed()
				.setTitle(`Your ping is ${ping} ms`)
				// .setImage("https://cdn.discordapp.com/attachments/722306381893599242/855600330405838849/catping.gif")
				.setColor(m.embeds![0]!.hexColor!);
			// Then It Edits the message with the ping variable embed that you created
			await m.edit({embeds: [embed]}).then(async m => {
				let embed = new MessageEmbed()
					.setTitle(`Your ping is ${ping} ms`)
					.setImage(
						"https://cdn.discordapp.com/attachments/722306381893599242/855600330405838849/catping.gif")
					.setColor(m.embeds![0]!.hexColor!);
				await m.edit({embeds: [embed]});
			});
		});
	},
};

export const nowPlaying: Command = {
	name: "nowplaying",
	aliases: ["np"],
	description: "!nowplaying",
	group: "music",
	owner: false,
	voiceChannel:true,
	async execute(message: Message, client: Client, args: string[]) {
		const queue = player.getQueue(message.guild!.id);
		if (!queue || !queue.playing) return message.reply(`No music currently playing`);
		
		const track = queue.current;
		
		const methods = ['disabled', 'track', 'queue'];
		
		const timestamp = queue.getPlayerTimestamp();
		const trackDuration = timestamp.progress == Infinity ? 'infinity (live)' : track.duration;
		
		let embed = new MessageEmbed()
			.setColor('RED')
			.setThumbnail(track.thumbnail)
			.setDescription(
				`Volume **${queue.volume}**%\nDuration **${trackDuration}**\nLoop mode **${methods[queue.repeatMode]}**\nRequested by ${track.requestedBy}`
			)
			.setTimestamp()
			
			.setAuthor(track.title, await client.user!.displayAvatarURL({ size: 1024, dynamic: true }));
		
		await message.reply({
			embeds:[embed]
		})
	},
};

export const play: Command = {
	name: "play",
	aliases: ["p"],
	description: "!play",
	group: "music",
	owner: false,
	voiceChannel:true,
	async execute(message: Message, client: Client, args: string[]) {
		if (!args[0]) return message.channel.send(`Please enter a valid search ${message.author}`);
		
		const res = await player.search(args.join(' '), {
			requestedBy: message.member!,
			searchEngine: QueryType.AUTO
		});
		
		if (!res || !res.tracks.length) return message.channel.send(`No results found ${message.author}`);
		
		const queue = await player.createQueue(message.guild!!, {
			metadata: message.channel
		});
		
		try {
			if (!queue.connection) await queue.connect(message.member!.voice.channel!);
		} catch {
			await player.deleteQueue(message.guild!.id);
			return message.channel.send(`I can't join the voice channel ${message.author}`);
		}
		
		await message.channel.send(`Loading your ${res.playlist ? 'playlist' : 'track'}`);
		
		res.playlist ? queue.addTracks(res.tracks) : queue.addTrack(res.tracks[0]);
		
		if (!queue.playing) await queue.play();
	},
};

export const pause: Command = {
	name: "pause",
	aliases: ["ps"],
	description: "!pause",
	group: "music",
	owner: false,
	voiceChannel:true,
	async execute(message: Message, client: Client, args: string[]) {
		const queue = player.getQueue(message.guild!.id);
		
		if (!queue) return message.channel.send(`No music currently playing ${message.author}`);
		
		const success = queue.setPaused(true);
		
		return message.channel.send(success ? `Current music ${queue.current.title} paused` : `Something went wrong ${message.author}`);
	},
};

export const resume: Command = {
	name: "resume",
	aliases: ["rs"],
	description: "!resume",
	group: "music",
	owner: false,
	voiceChannel:true,
	async execute(message: Message, client: Client, args: string[]) {
		const queue = player.getQueue(message.guild!.id);
		
		if (!queue) return message.channel.send(`No music currently playing ${message.author}`);
		
		const success = queue.setPaused(false);
		
		return message.channel.send(success ? `Current music ${queue.current.title} resumed` : `Something went wrong ${message.author}`);
	},
};

export const search: Command = {
	name: "search",
	aliases: ["s"],
	description: "!search",
	group: "music",
	owner: false,
	voiceChannel:true,
	async execute(message: Message, client: Client, args: string[]) {
		if (!args[0]) return message.reply(`Please enter a valid search`);
		
		const res = await player.search(args.join(' '), {
			requestedBy: message.member!,
			searchEngine: QueryType.AUTO
		});
		
		if (!res || !res.tracks.length) return message.channel.send(`No results found ${message.author}`);
		
		const queue = await player.createQueue(message.guild!!, {
			metadata: message.channel
		});
		
		const embed = new MessageEmbed();
		
		embed.setColor('RED');
		embed.setAuthor(`Results for ${args.join(' ')}`, await client.user!.displayAvatarURL({ size: 1024, dynamic: true }));
		
		const maxTracks = res.tracks.slice(0, 10);
		
		embed.setDescription(`${maxTracks.map((track, i) => `**${i + 1}**. ${track.title} | ${track.author}`).join('\n')}\n\nSelect choice between **1** and **${maxTracks.length}** or **cancel** ⬇️`);
		
		embed.setTimestamp();
		
		message.channel.send({ embeds: [embed] });
		
		const collector = message.channel.createMessageCollector({
			time: 15000,
			//@ts-ignore
			errors: ['time'],
			filter: m => m.author.id === message.author.id
		});
		
		//@ts-ignore
		collector.on('collect', async (query) => {
			//@ts-ignore
			if (query.content.toLowerCase() === 'cancel') return message.channel.send(`Search cancelled ✅`) && collector.stop();
			
			const value = parseInt(query.content);
			
			if (!value || value <= 0 || value > maxTracks.length) return message.channel.send(`Invalid response, try a value between **1** and **${maxTracks.length}** or **cancel**`);
			
			collector.stop();
			
			try {
				//@ts-ignore
				if (!queue.connection) await queue.connect(message.member.voice.channel);
			} catch {
				await player.deleteQueue(message.guild!.id);
				return message.channel.send(`I can't join the voice channel ${message.author}`);
			}
			
			await message.channel.send(`Loading your search... 🎧`);
			
			//@ts-ignore
			queue.addTrack(res.tracks[query.content - 1]);
			
			if (!queue.playing) await queue.play();
		});
		
		//@ts-ignore
		collector.on('end', (msg, reason) => {
			if (reason === 'time') return message.channel.send(`Search timed out ${message.author}`);
		});
	},
};

export const seek: Command = {
	name: "seek",
	aliases: ["sk"],
	description: "!seek",
	group: "music",
	owner: false,
	voiceChannel:true,
	async execute(message: Message, client: Client, args: string[]) {
		const queue = player.getQueue(message.guild!.id);
		
		if (!queue || !queue.playing) return message.channel.send(`No music currently playing ${message.author}... try again ? ❌`);
		
		//@ts-ignore
		const timeToMS = ms(args.join(' '));
		
		if (timeToMS >= queue.current.durationMS) return message.channel.send(`The indicated time is higher than the total time of the current song ${message.author}... try again ? ❌\n*Try for example a valid time like **5s, 10s, 20 seconds, 1m**...*`);
		
		await queue.seek(timeToMS);
		
		message.channel.send(`Time set on the current song **${ms(timeToMS, { long: true })}** ✅`);
	},
};

export const shuffle: Command = {
	name: "shuffle",
	aliases: ["sh"],
	description: "!shuffle",
	group: "music",
	owner: false,
	voiceChannel:true,
	async execute(message: Message, client: Client, args: string[]) {
		const queue = player.getQueue(message.guild!.id);
		
		if (!queue || !queue.playing) return message.channel.send(`No music currently playing ${message.author}... try again ? ❌`);
		
		if (!queue.tracks[0]) return message.channel.send(`No music in the queue after the current one ${message.author}... try again ? ❌`);
		
		await queue.shuffle();
		
		return message.channel.send(`Queue shuffled **${queue.tracks.length}** song(s) ! ✅`);
	},
};

export const skip: Command = {
	name: "skip",
	aliases: ["sk"],
	description: "!skip",
	group: "music",
	owner: false,
	voiceChannel:true,
	async execute(message: Message, client: Client, args: string[]) {
		const queue = player.getQueue(message.guild!.id);
		
		if (!queue || !queue.playing) return message.channel.send(`No music currently playing ${message.author}... try again ? ❌`);
		
		const success = queue.skip();
		
		return message.channel.send(success ? `Current music ${queue.current.title} skipped ✅` : `Something went wrong ${message.author}... try again ? ❌`);
	},
};

export const stop: Command = {
	name: "stop",
	aliases: ["sp"],
	description: "!stop",
	group: "music",
	owner: false,
	voiceChannel:true,
	async execute(message: Message, client: Client, args: string[]) {
		const queue = player.getQueue(message.guild!.id);
		
		if (!queue || !queue.playing) return message.channel.send(`No music currently playing ${message.author}... try again ? ❌`);
		
		queue.destroy();
		
		message.channel.send(`Music stopped into this server, see you next time ✅`);
	},
};

export const volume: Command = {
	name: "volume",
	aliases: ["vl"],
	description: "!volume",
	group: "music",
	owner: false,
	voiceChannel:true,
	async execute(message: Message, client: Client, args: string[]) {
		const maxVol = musicPermissions.opt.maxVol
		const queue = player.getQueue(message.guild!.id!);
		
		if (!queue || !queue.playing) return message.channel.send(`No music currently playing ${message.author}... try again ? ❌`);
		
		const vol = parseInt(args[0]);
		
		if (!vol) return message.channel.send(`The current volume is ${queue.volume} 🔊\n*To change the volume enter a valid number between **1** and **${maxVol}**.*`);
		
		if (queue.volume === vol) return message.channel.send(`The volume you want to change is already the current one ${message.author}... try again ? ❌`);
		
		if (vol < 0 || vol > maxVol) return message.channel.send(`The specified number is not valid. Enter a number between **1** and **${maxVol}** ${message.author}... try again ? ❌`);
		
		const success = queue.setVolume(vol);
		
		return message.channel.send(success ? `The volume has been modified to **${vol}**/**${maxVol}**% 🔊` : `Something went wrong ${message.author}... try again ? ❌`);
	},
};

export const queue: Command = {
	name: "queue",
	aliases: ["q"],
	description: "!volume",
	group: "music",
	owner: false,
	voiceChannel:true,
	async execute(message: Message, client: Client, args: string[]) {
		const queue = player.getQueue(message.guild!.id);
		
		if (!queue) return await message.channel.send(`No music currently playing ${message.author}... try again ? ❌`);
		
		if (!queue.tracks[0]) return await message.channel.send(`No music in the queue after the current one ${message.author}... try again ? ❌`);
		
		const embed = new MessageEmbed();
		const methods = ['', '🔁', '🔂'];
		
		embed.setColor('RED');
		embed.setThumbnail(message.guild!!.iconURL({ size: 2048, dynamic: true })!);
		embed.setAuthor(`Server queue - ${message.guild!!.name} ${methods[queue.repeatMode]}`, await client.user!.displayAvatarURL({ size: 1024, dynamic: true }));
		
		const tracks = queue.tracks.map((track, i) => `**${i + 1}** - ${track.title} | ${track.author} (requested by : ${track.requestedBy.username})`);
		
		const songs = queue.tracks.length;
		const nextSongs = songs > 5 ? `And **${songs - 5}** other song(s)...` : `In the playlist **${songs}** song(s)...`;
		
		embed.setDescription(`Current ${queue.current.title}\n\n${tracks.slice(0, 5).join('\n')}\n\n${nextSongs}`);
		
		embed.setTimestamp();
		
		await message.channel.send({ embeds: [embed] });
	},
};

export default [
	queue,
	volume,
	stop,
	skip,
	shuffle,
	seek,
	search,
	resume,
	pause,
	pause,
	play,
	nowPlaying,
	ping,
];