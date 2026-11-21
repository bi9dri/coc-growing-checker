export interface DiceResult {
  total: number;
  text: string;
}

export interface DiceRoller {
  roll(expression: string): DiceResult;
}
