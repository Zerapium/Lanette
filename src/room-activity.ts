import { Room } from "./rooms";
import { User } from "./users";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PlayerList = Dict<Player> | Player[] | Map<Player, any>;

export class Player {
	active: boolean | null = null;
	/** The player either left or got eliminated during gameplay; can no longer perform any actions */
	eliminated: boolean | null = null;
	/** The player can temporarily not perform any actions */
	frozen: boolean | null = null;
	losses: number | null = null;
	team: PlayerTeam | null = null;

	id: string;
	readonly activity: Activity;
	name: string;

	constructor(user: User | string, activity: Activity) {
		if (typeof user === 'string') {
			this.id = Tools.toId(user);
			this.name = user;
		} else {
			this.id = user.id;
			this.name = user.name;
		}
		this.activity = activity;
	}

	say(message: string): void {
		const user = Users.get(this.name);
		if (user) user.say(message);
	}

	sayHtml(html: string): void {
		this.activity.pmRoom.pmHtml(this, html);
	}

	sayUhtml(html: string, name?: string): void {
		this.activity.pmRoom.pmUhtml(this, name || this.activity.uhtmlBaseName, html);
	}

	sayUhtmlChange(html: string, name?: string): void {
		this.activity.pmRoom.pmUhtmlChange(this, name || this.activity.uhtmlBaseName, html);
	}

	useCommand(command: string, target?: string): void {
		let expiredUser = false;
		let user = Users.get(this.name);
		if (!user) {
			expiredUser = true;
			user = Users.add(this.name, this.id);
		}
		void CommandParser.parse(this.activity.room, user, Config.commandCharacter + command + (target !== undefined ? " " + target : ""));
		if (expiredUser) Users.remove(user);
	}
}

export class PlayerTeam {
	players: Player[] = [];
	points: number = 0;

	name: string;
	id: string;

	constructor(name: string) {
		this.name = name;
		this.id = Tools.toId(name);
	}

	getPlayerNames(): string[] {
		const names: string[] = [];
		for (const player of this.players) {
			names.push(player.name);
		}
		return names;
	}
}

export abstract class Activity {
	readonly activityType: string = '';
	readonly createTime: number = Date.now();
	ended: boolean = false;
	htmlMessageListeners: string[] = [];
	messageListeners: string[] = [];
	playerCount: number = 0;
	players: Dict<Player> = {};
	showSignupsHtml: boolean = false;
	signupsHtmlTimeout: NodeJS.Timer | null = null;
	started: boolean = false;
	startTime: number | null = null;
	startTimer?: NodeJS.Timer;
	timeout: NodeJS.Timer | null = null;
	uhtmlMessageListeners: Dict<string[]> = {};

	// set in initialize()
	id!: string;
	name!: string;
	uhtmlBaseName!: string;

	readonly room: Room | User;
	readonly pm: boolean;
	readonly pmRoom: Room;

	constructor(room: Room | User, pmRoom?: Room) {
		this.room = room;
		this.pm = pmRoom && room !== pmRoom ? true : false;
		this.pmRoom = this.isPm(room) ? pmRoom! : room;
	}

	abstract deallocate(forceEnd: boolean): void;
	abstract forceEnd(user?: User, reason?: string): void;
	abstract start(): void;

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	isPm(room: Room | User): room is User {
		return this.pm;
	}

	createPlayer(user: User | string): Player | void {
		const id = Tools.toId(user);
		if (id in this.players) return;
		const player = new Player(user, this);
		this.players[id] = player;
		this.playerCount++;
		return player;
	}

	renamePlayer(user: User, oldId: string): void {
		if (!(oldId in this.players) || (user.id in this.players && oldId !== user.id)) return;
		const player = this.players[oldId];
		player.name = user.name;
		if (player.id === user.id) return;
		player.id = user.id;
		delete this.players[oldId];
		this.players[player.id] = player;
		if (this.onRenamePlayer) this.onRenamePlayer(player, oldId);
	}

	destroyPlayer(user: User | string, forceDelete?: boolean): Player | void {
		const id = Tools.toId(user);
		if (!(id in this.players)) return;
		const player = this.players[id];
		if (this.started && !forceDelete) {
			this.players[id].eliminated = true;
		} else {
			delete this.players[id];
			this.playerCount--;
		}
		return player;
	}

	end(): void {
		if (this.timeout) clearTimeout(this.timeout);
		if (this.onEnd) this.onEnd();
		this.ended = true;
		this.deallocate(false);
	}

	say(message: string): void {
		this.room.say(message);
	}

	sayCommand(command: string, dontCheckFilter?: boolean): void {
		this.room.sayCommand(command, dontCheckFilter);
	}

	sayHtml(html: string): void {
		if (this.isPm(this.room)) return this.pmRoom.pmHtml(this.room, html);
		this.room.sayHtml(html);
	}

	sayUhtml(name: string, html: string): void {
		if (this.isPm(this.room)) return this.pmRoom.pmUhtml(this.room, name, html);
		this.room.sayUhtml(name, html);
	}

	sayUhtmlChange(name: string, html: string): void {
		if (this.isPm(this.room)) return this.pmRoom.pmUhtmlChange(this.room, name, html);
		this.room.sayUhtmlChange(name, html);
	}

	on(message: string, listener: () => void): void {
		if (this.ended) return;
		this.messageListeners.push(message);
		this.room.on(message, listener);
	}

	onHtml(html: string, listener: () => void): void {
		if (this.ended) return;
		this.htmlMessageListeners.push(html);
		this.room.onHtml(html, listener);
	}

	onUhtml(name: string, html: string, listener: () => void): void {
		if (this.ended) return;
		const id = Tools.toId(name);
		if (!(id in this.uhtmlMessageListeners)) this.uhtmlMessageListeners[id] = [];
		this.uhtmlMessageListeners[id].push(html);
		this.room.onUhtml(name, html, listener);
	}

	off(message: string): void {
		this.room.off(message);
	}

	offHtml(html: string): void {
		this.room.offHtml(html);
	}

	offUhtml(name: string, html: string): void {
		this.room.offUhtml(name, html);
	}

	cleanupMessageListeners(): void {
		for (const listener of this.htmlMessageListeners) {
			this.offHtml(listener);
		}

		for (const listener of this.messageListeners) {
			this.off(listener);
		}

		for (const name in this.uhtmlMessageListeners) {
			for (const listener of this.uhtmlMessageListeners[name]) {
				this.offUhtml(name, listener);
			}
		}
	}

	getPlayerList(players?: PlayerList, fromGetRemainingPlayers?: boolean): Player[] {
		if (Array.isArray(players)) return players;
		if (!players) {
			if (this.started && !fromGetRemainingPlayers) {
				players = this.getRemainingPlayers();
			} else {
				players = this.players;
			}
		}

		const playerList: Player[] = [];
		if (players instanceof Map) {
			players.forEach((value, player) => {
				playerList.push(player);
			});
		} else {
			for (const i in players) {
				playerList.push(players[i]);
			}
		}

		return playerList;
	}

	getRemainingPlayers(players?: PlayerList): Dict<Player> {
		const playerList = this.getPlayerList(players, true);
		const remainingPlayers: Dict<Player> = {};
		for (const player of playerList) {
			if (player.eliminated || player.frozen) continue;
			remainingPlayers[player.id] = player;
		}

		return remainingPlayers;
	}

	getRemainingPlayerCount(players?: PlayerList): number {
		return Object.keys(this.getRemainingPlayers(players)).length;
	}

	getFinalPlayer(): Player | undefined {
		const keys = Object.keys(this.getRemainingPlayers());
		if (keys.length !== 1) return undefined;
		return this.players[keys[0]];
	}

	getPlayerAttributes(attribute: (player: Player) => string, players?: PlayerList): string[] {
		const playerList = this.getPlayerList(players);
		const playerAttributes: string[] = [];
		for (const player of playerList) {
			playerAttributes.push(attribute(player));
		}

		return playerAttributes;
	}

	getPlayerNames(players?: PlayerList): string {
		return this.getPlayerAttributes(player => player.name, players).join(', ');
	}

	getSignupsHtml?(): string;
	onEnd?(): void;
	onForceEnd?(user?: User, reason?: string): void;
	onRenamePlayer?(player: Player, oldId: string): void;
}
