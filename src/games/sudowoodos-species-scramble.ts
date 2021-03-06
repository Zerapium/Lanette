import { Room } from "../rooms";
import { IGameFile } from "../types/games";
import { game as guessingGame, Guessing } from "./templates/guessing";

const name = "Sudowoodo's Species Scramble";
const data: {categories: Dict<string[]>} = {
	categories: {},
};
const categoryKeys: string[] = [];
let loadedData = false;

class SudowoodosSpeciesScramble extends Guessing {
	static loadData(room: Room): void {
		if (loadedData) return;
		room.say("Loading data for " + name + "...");

		const pokemonList = Games.getPokemonList(pokemon => !!pokemon.category);
		for (const pokemon of pokemonList) {
			if (!(pokemon.category in data.categories)) {
				data.categories[pokemon.category] = [];
				categoryKeys.push(pokemon.category);
			}
			data.categories[pokemon.category].push(pokemon.name);
		}

		loadedData = true;
	}

	onSignups(): void {
		if (this.format.options.freejoin) this.timeout = setTimeout(() => this.nextRound(), 10 * 1000);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async setAnswers(): Promise<void> {
		const category = this.sampleOne(categoryKeys);
		this.answers = data.categories[category];
		this.hint = "<b>Sudowoodo imitated</b>: <i>the " + category + " Pokemon</i>";
	}
}

export const game: IGameFile<SudowoodosSpeciesScramble> = Games.copyTemplateProperties(guessingGame, {
	aliases: ["sudowoodos", "sss", "speciesscramble"],
	category: 'knowledge',
	class: SudowoodosSpeciesScramble,
	defaultOptions: ['points'],
	description: "Players guess Pokemon based on the given categories!",
	freejoin: true,
	name,
	mascot: "Sudowoodo",
	modes: ['survival', 'team'],
});
