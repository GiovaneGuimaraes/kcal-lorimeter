export interface Goal {
  id: string;
  kcal: number;
  proteinaG: number;
  carboG: number;
  gorduraG: number;
  /** Data ISO `yyyy-mm-dd` a partir da qual a meta vale. */
  vigenteDesde: string;
}
