import type { Book } from './types';
import { windwardRun } from './windward-run';

/** Every book the game ships. Its test validates each one; which book opens is the shelf slice's question. */
export const BOOKS: readonly Book[] = [windwardRun];
