import { Client, Intents } from "discord.js";

export const client: Client = new Client({
	intents: [
		Intents.FLAGS.GUILDS,
		Intents.FLAGS.GUILD_MEMBERS,
		Intents.FLAGS.GUILD_BANS,
		Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS,
		Intents.FLAGS.GUILD_INTEGRATIONS,
		Intents.FLAGS.GUILD_WEBHOOKS,
		Intents.FLAGS.GUILD_INVITES,
		Intents.FLAGS.GUILD_VOICE_STATES,
		Intents.FLAGS.GUILD_PRESENCES,
		Intents.FLAGS.GUILD_MESSAGES,
		Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
		Intents.FLAGS.GUILD_MESSAGE_TYPING,
		Intents.FLAGS.DIRECT_MESSAGES,
		Intents.FLAGS.DIRECT_MESSAGE_REACTIONS,
		Intents.FLAGS.DIRECT_MESSAGE_TYPING,
	],
	allowedMentions: {
		parse: ["users", "roles", "everyone"],
		repliedUser: true,
	},
	partials: ["USER", "CHANNEL", "GUILD_MEMBER", "MESSAGE", "REACTION"],
	restRequestTimeout: 90000,
});

client.once("ready", async () => {
	
	console.log("\n");
	console.log(`Logged in as ${client.user?.tag}\nPrefix is !`);
	console.log(`In ${client.guilds.cache.size} servers\nTotal users is ${client.users.cache.size}\n\n`);
	
	await client.user!.setStatus("dnd");
});

client.on("error", async (error) => {
	console.log(error.stack);
});