import type { Client, Message } from "discord.js";

export interface Command {
	name: string
	aliases?: string[];
	description: string
	group: string;
	groupCommand?: boolean;
	owner: boolean;
	voiceChannel:boolean;
	
	// Making `args` optional
	execute(message: Message, client: Client, args?: string[], ownerID?: string, silentargs?: string[]): Promise<any>;
}

export let musicPermissions = {
	opt: {
		DJ: {
			enabled: false,
			roleName: 'DJ',
			commands: ['back', 'clear', 'filter', 'loop', 'pause', 'resume', 'seek', 'shuffle', 'skip', 'stop', 'volume']
		},
		maxVol: 100,
		loopMessage: false,
		discordPlayer: {
			ytdlOptions: {
				quality: 'highestaudio',
				highWaterMark: 1 << 25
			}
		}
	}
}