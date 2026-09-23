import { saltRoad } from './salt-road';
import type { Book } from './types';

/** Every book the game ships. Its test validates each one; which book opens is the shelf slice's question. */
export const BOOKS: readonly Book[] = [saltRoad];
