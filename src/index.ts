import { Client, Message, MessageEmbed, MessageReaction, TextChannel, User } from "discord.js";
import { Player } from "discord-player";
import express from "express";
import { closest } from "fastest-levenshtein";
import * as path from "path";
import http from "http";
import { client } from "./listener";
import { musicPermissions } from "./type";
import type { Command } from "./type";
import * as allCommands from "./commands/index";

export const cmd = allCommands.default;
export let prefix: string = process.env.prefix!;
require("dotenv").config();

//Set global time to GMT -5
process.env.TZ = "America/Toronto";

let commands: Command[] = cmd;

//Express for hosting
const app = express();
app.use(express.static(path.join(__dirname, "../")));

//@ts-ignore
let _server = http.createServer(app);
let Port = process.env.PORT || 100;

app.get("/", (request, response) => {
	response.sendStatus(200);
});

const httpListener = app.listen(Port, () => {
	//@ts-ignore
	console.log(`Your app is listening on port ${httpListener.address().port}`);
});

client.on("messageCreate", async message => {
	if (message.author.bot) return;
	let args: Array<string>;
	
	if (message.content.startsWith(process.env.prefix!) || message.content.startsWith(`<@!${client.user!.id}>`)) {
		args = message.content.startsWith(process.env.prefix!)
			? message.content.replace(process.env.prefix!, "").trim().split(/ +/g)
			: message.content.replace((`<@!${client.user!.id}>`), "").trim().split(/ +/g);
		
		if (message.content.startsWith(`<@!${client.user!.id}>`)) {
			message.mentions.users.delete(client.user!.id);
		}
	}
	
	else {
		return
	}
	
	let commandName: string | undefined = args?.shift()?.toLowerCase();
	
	if (commandName === undefined) {
		return;
	}
	
	if (commandName === "test") {
		//Always
		return;
	}
	
	let command = commands.find(c => {
		if (typeof (c.aliases!) !== "undefined" && c.aliases!.length > 0) {
			return (c.aliases?.includes(commandName!) || c.name.toLowerCase() === commandName);
		}
		else {
			return c.name.toLowerCase() === commandName;
		}
	});
	
	commandName = command ? command.name : commandName;
	
	if (command?.groupCommand === true) {
		if (typeof args[0] !== "undefined") {
			if (args[0]?.includes("-")) {
				command = commands.find(cmd => cmd.name.toLowerCase() === (commandName + " " + args[0].toLowerCase()));
				args.splice(0, 1);
			}
			else {
				command = commands.find(cmd => cmd.name.toLowerCase() === (commandName));
			}
		}
		else {
			command = commands.find(cmd => cmd.name.toLowerCase() === (commandName));
		}
	}
	
	if (command) {
		
		console.log("Running Command");
		await runCommand(command, message, client, args);
	}
	
	else if (!command && message.guild!!.id === "719406444109103117") {
		await message.channel.send({embeds: [<MessageEmbed>await commandError(message, client, commandName, false)]})
					 .then(async mssg => {
						 let probablyName = closest(commandName!, commands.map(cmd => cmd.name).sort());
						 let emote = `☑️`;
						 let msg = await message
							 .channel
							 .send(`Did you mean \`!${probablyName}\`? If so, click on the the ${emote} to continue.`);
			
						 await msg.react(`${emote}`);
						 let emoteFilter = (reaction: MessageReaction, user: User) => reaction.emoji.name === `${emote}` && !user.bot;
						 const approve = msg.createReactionCollector({filter: emoteFilter, time: 50000});
			
						 approve.on("collect", async () => {
							 let cmd = commands.find(c => c.name.toLowerCase() === probablyName)!;
				
							 await runCommand(cmd, message, client, args);
						 });
			
					 });
	}
});

export const player = new Player(client, musicPermissions.opt.discordPlayer);

client.login(process.env.token!);

async function runCommand(command: Command, message: Message, client: Client, args: string[]) {
	if (command.owner) {
		try {
			if (message.author.id === process.env.owner) {
				await command.execute(message, client, args, process.env.owner);
			}
			
			else {
				return message.reply("You are not allowed to use this command");
			}
			
		} catch (error) {
			message.channel.send(<string>await commandError(message, client, message.author.username, true, error));
		}
	}
	else {
		try {
			if (command && command.voiceChannel) {
				if (!message.member!.voice.channel) return message.channel.send(`You're not in a voice channel ${message.author}... try again ? ❌`);
				
				if (message.guild!!.me!.voice.channel && message.member!.voice.channel.id !== message.guild!!.me!.voice.channel.id) return message.channel.send(`You are not in the same voice channel ${message.author}... try again ? ❌`);
			}
			await command.execute(message, client, args);
			
		} catch (error) {
			message.channel.send(<string>await commandError(message, client, message.author.username, true, error));
		}
	}
}

async function commandError(message: Message, client: Client, name: string, exist?: boolean, err?: any): Promise<MessageEmbed | string> {
	// noinspection SpellCheckingInspection
	console.log(err);
	let imgurl = (client.users.cache.get("239516219445608449")!.displayAvatarURL({format: "webp", size: 512}));
	let d = new Date();
	let em = new MessageEmbed()
		.setColor("RED")
		.setTitle("ERROR")
		.addFields({
			name: "Channel Name",
			value: `${(<TextChannel>await client.channels.fetch(message.channel.id)).name}`,
			inline: true,
		}, {name: "Channel Id", value: `${message.channel.id}`, inline: true}, {
			name: "User", value: `${message.author.tag}`, inline: true,
		}, {name: "User Id", value: `${message.author.id}`, inline: true}, {
			name: `Command`, value: `!${name}`, inline: true,
		}, {name: "Time", value: `${d.toLocaleString("en-US", {timeZone: "America/New_York"})}`, inline: true});
	if (!exist) {
		em
			.setDescription(
				`Command does not exist. If you think this is in error please contact <@239516219445608449>`)
			.setFooter("blitzwolfz#9338", `${imgurl}`);
		return em;
		
	}
	else {
		em
			.setDescription(`\`\`\`${err.message}\n${err.stack}\`\`\``)
			.setFooter("blitzwolfz#9338", `${imgurl}`);
		let errorChannel = <TextChannel>client.channels.cache.get("902212023352438866");
		
		await errorChannel.send({
			embeds: [
				em,
			],
			content: `<@239516219445608449>, <@${message.author.id}> caused this error. Happened in Channel <#${message.channel.id}>`,
		});
		
		
		return "A command error has happened. blitzwolfz has been notified.";
	}
}

process.on("uncaughtException", function (err) {
	console.log("Caught exception: ", err);
});