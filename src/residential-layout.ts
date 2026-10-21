export interface ResidentialRoom {
  x: number;
  y: number;
  light?: { period: number; phase: number };
}
export interface ResidentialHouse {
  x: number;
  width: number;
  top: number;
  body: number;
  antenna: boolean;
  rooms: ResidentialRoom[];
}
export interface StreetGap {
  after: number;
  left: number;
  width: number;
  leftTrim: number;
  rightTrim: number;
}

/** Collect before drawing so opening one alley does not change any later random draws. */
export function residentialHouses(width: number, random: () => number): ResidentialHouse[] {
  const houses: ResidentialHouse[] = [];
  for (let x = -12; x < width;) {
    const house: ResidentialHouse = {
      x, width: 31 + Math.floor(random() * 34), top: 274 + Math.floor(random() * 27),
      body: random() > 0.5 ? 0x24253a : 0x2e2b40, antenna: random() > 0.4, rooms: [],
    };
    for (let y = house.top + 9; y < 330; y += 16) {
      for (let roomX = x + 6; roomX < x + house.width - 10; roomX += 13) {
        let light: ResidentialRoom['light'];
        if (random() > 0.28) {
          const period = 18 + random() * 28;
          light = { period, phase: random() * period };
        }
        house.rooms.push({ x: roomX, y, light });
      }
    }
    houses.push(house);
    x += house.width + 4;
  }
  return houses;
}

/** Favor a clear view near the middle, while keeping every house at its original position. */
export function streetGap(houses: readonly ResidentialHouse[], width: number): StreetGap | undefined {
  const chair = Math.round(width * 0.68);
  const blocked = [[0, 47], [chair - 1, chair + 31], [width - 30, width - 14]];
  let best: StreetGap | undefined;
  let bestScore = Infinity;
  for (let index = 0; index < houses.length - 1; index++) {
    const end = houses[index].x + houses[index].width;
    for (let leftTrim = 0; leftTrim <= 12; leftTrim++) {
      const rightTrim = 12 - leftTrim;
      const left = end - leftTrim;
      const right = houses[index + 1].x + rightTrim;
      if (left < 0 || right > width) continue;
      let visible = 0;
      for (let x = left; x < right; x++) {
        if (!blocked.some(([start, finish]) => x >= start && x < finish)) visible++;
      }
      if (visible < 10) continue;
      const score = (16 - visible) * 1000 + Math.abs((left + right) / 2 - width * 0.45)
        + Math.abs(leftTrim - rightTrim) * 0.02;
      if (score < bestScore) {
        bestScore = score;
        best = { after: index, left, width: right - left, leftTrim, rightTrim };
      }
    }
  }
  return best;
}
