import { Player } from "../room-activity";
import { IGameOptionValues } from "../room-game";
import { Room } from "../rooms";
import { IGameFile, AchievementsDict } from "../types/games";
import { game as guessingGame, Guessing } from "./templates/guessing";

const name = "Zygarde's Orders";
const data: {'Characters': string[]; 'Locations': string[]; 'Pokemon': string[]; 'Pokemon Abilities': string[]; 'Pokemon Items': string[]; 'Pokemon Moves': string[]} = {
	"Characters": [],
	"Locations": [],
	"Pokemon": [],
	"Pokemon Abilities": [],
	"Pokemon Items": [],
	"Pokemon Moves": [],
};
type DataKey = keyof typeof data;
const categories = Object.keys(data) as DataKey[];
let loadedData = false;

const achievements: AchievementsDict = {
	"tallorder": {name: "Tall Order", type: 'special', bits: 1000, description: "guess the answer with only 1 letter revealed"},
};

class ZygardesOrders extends Guessing {
	allLetters: number = 0;
	guessedLetters: string[] = [];
	guessLimit: number = 10;
	hints: string[] = [];
	lastAnswer: string = '';
	letters: string[] = [];
	orderRound: number = 0;
	revealedLetters: number = 0;
	roundGuesses = new Map<Player, boolean>();
	solvedLetters: string[] = [];

	static loadData(room: Room): void {
		if (loadedData) return;
		room.say("Loading data for " + name + "...");

		data["Characters"] = Dex.data.characters.slice();
		data["Locations"] = Dex.data.locations.slice();
		data["Pokemon"] = Games.getPokemonList().map(x => x.name);
		data["Pokemon Abilities"] = Games.getAbilitiesList().map(x => x.name);
		data["Pokemon Items"] = Games.getItemsList().map(x => x.name);
		data["Pokemon Moves"] = Games.getMovesList().map(x => x.name);

		loadedData = true;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async setAnswers(): Promise<void> {
		const category = (this.roundCategory || this.variant || this.sampleOne(categories)) as DataKey;
		let answer = this.sampleOne(data[category]);
		while (answer === this.lastAnswer) {
			answer = this.sampleOne(data[category]);
		}
		this.lastAnswer = answer;
		this.answers = [answer];
		this.orderRound = 0;
		this.roundGuesses.clear();
		this.letters = Tools.toId(answer).split("");
		this.allLetters = this.letters.length;
		this.hints = this.letters.slice();
		for (let i = 0; i < this.hints.length; i++) {
			this.hints[i] = '';
		}
		const firstLetter = this.random(this.letters.length);
		this.hints[firstLetter] = this.letters[firstLetter];
		this.revealedLetters = 1;
		this.say("The category is **" + category + "**");
	}

	async onNextRound(): Promise<void> {
		if (!this.answers.length) {
			this.canGuess = false;
			await this.setAnswers();
		}
		this.orderRound++;
		if (this.orderRound > 1) {
			let indicies: number[] = [];
			for (let i = 0; i < this.hints.length; i++) {
				if (this.hints[i] === '') indicies.push(i);
			}

			if (!indicies.length) {
				const text = "All possible letters have been revealed! " + this.getAnswers('');
				this.on(text, () => {
					this.answers = [];
					if (this.isMiniGame) {
						this.end();
						return;
					}
					this.timeout = setTimeout(() => this.nextRound(), 5 * 1000);
				});
				this.say(text);
				return;
			}

			indicies = this.shuffle(indicies);
			for (const index of indicies) {
				this.hints[index] = this.letters[index];
				if (Client.willBeFiltered(this.hints.join(""), this.isPm(this.room) ? undefined : this.room)) {
					this.hints[index] = '';
					continue;
				}
				break;
			}
			this.revealedLetters++;
		}
		const text = "**" + this.hints.join("") + "**";
		this.on(text, () => {
			if (this.revealedLetters >= this.allLetters) {
				const text = "All letters have been revealed! " + this.getAnswers('');
				this.on(text, () => {
					this.answers = [];
					if (this.isMiniGame) {
						this.end();
						return;
					}
					this.timeout = setTimeout(() => this.nextRound(), 5 * 1000);
				});
				this.say(text);
			} else {
				if (!this.canGuess) this.canGuess = true;
				this.timeout = setTimeout(() => this.nextRound(), 5 * 1000);
			}
		});
		this.say(text);
	}

	onCorrectGuess(player: Player, answer: string): void {
		if (this.revealedLetters === 1) this.unlockAchievement(player, achievements.tallorder!);
	}
}

export const game: IGameFile<ZygardesOrders> = Games.copyTemplateProperties(guessingGame, {
	achievements,
	aliases: ["zygardes", "zo"],
	category: 'identification',
	class: ZygardesOrders,
	customizableOptions: {
		points: {min: 5, base: 5, max: 5},
	},
	description: "Players guess answers as letters are revealed one by one (one guess per round)!",
	formerNames: ["Orders"],
	freejoin: true,
	name,
	mascot: "Zygarde",
	minigameCommand: 'order',
	minigameDescription: 'Use ``' + Config.commandCharacter + 'g`` to guess the answer as letters are revealed one by one (one chance to guess correctly)!',
	variants: [
		{
			name: "Zygarde's Ability Orders",
			variant: "Pokemon Abilities",
			variantAliases: ['ability', 'abilities'],
		},
		{
			name: "Zygarde's Character Orders",
			variant: "Characters",
			variantAliases: ['character'],
		},
		{
			name: "Zygarde's Item Orders",
			variant: "Pokemon Items",
			variantAliases: ['item', 'items'],
		},
		{
			name: "Zygarde's Location Orders",
			variant: "Locations",
			variantAliases: ['location'],
		},
		{
			name: "Zygarde's Move Orders",
			variant: "Pokemon Moves",
			variantAliases: ['move', 'moves'],
		},
		{
			name: "Zygarde's Pokemon Orders",
			variant: "Pokemon",
		},
	],
});
