const names = [
  "Avery",
  "Riley",
  "Jordan",
  "Angel",
  "Parker",
  "Sawyer",
  "Peyton",
  "Quinn",
  "Blake",
  "Hayden",
  "Taylor",
  "Alexis",
  "Rowan",
  "Charlie",
  "Emerson",
  "Finley",
  "River",
  "Ariel",
  "Emery",
  "Morgan",
];

const attributes = [
  "Lazy",
  "Old",
  "Young",
  "Cranky",
  "Moody",
  "Lame",
  "Cool",
  "Wild",
  "Mad",
  "Holy",
  "Amazing",
  "Angry",
  "Anxious",
  "Demonic",
  "Fabulous",
  "Foolish",
  "Gentle",
  "Honorable",
  "Illustrious",
];

export function pick<T>(data: Array<T>) {
  const index = Math.floor(Math.random() * data.length)
  return data[index]
}

export function createName() {
  const attribute = pick(attributes);
  const name = pick(names);
  return `${attribute} ${name}`;
}
