export interface QuestionOption {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  text: string;
  options: QuestionOption[];
  correctOptionId: string;
}

export interface Round {
  id: string;
  name: string;
  emoji: string;
  description: string;
  questions: Question[];
}

export const rounds: Round[] = [
  {
    id: 'round1',
    name: 'General Knowledge',
    emoji: '🌍',
    description: 'Test your knowledge of the world around you!',
    questions: [
      {
        id: 'r1q1',
        text: 'What is the highest grossing film of all time?',
        options: [
          { id: 'A', text: 'Jurassic Park' },
          { id: 'B', text: 'Avengers: Endgame' },
          { id: 'C', text: 'Titanic' },
          { id: 'D', text: 'Minions' },
        ],
        correctOptionId: 'B',
      },
      {
        id: 'r1q2',
        text: 'Who holds the record for the most Olympic gold medals?',
        options: [
          { id: 'A', text: 'Michael Phelps' },
          { id: 'B', text: 'Simone Biles' },
          { id: 'C', text: 'Usain Bolt' },
          { id: 'D', text: 'Larisa Latynina' },
        ],
        correctOptionId: 'A',
      },
      {
        id: 'r1q3',
        text: 'What is the largest ocean in the world?',
        options: [
          { id: 'A', text: 'Indian Ocean' },
          { id: 'B', text: 'The Pacific Ocean' },
          { id: 'C', text: 'Arctic Ocean' },
          { id: 'D', text: 'Atlantic Ocean' },
        ],
        correctOptionId: 'B',
      },
      {
        id: 'r1q4',
        text: 'What is the fastest land animal?',
        options: [
          { id: 'A', text: 'Elephant' },
          { id: 'B', text: 'The Cheetah' },
          { id: 'C', text: 'That really fast spider' },
          { id: 'D', text: 'Samuel when Amali is chasing him' },
        ],
        correctOptionId: 'B',
      },
      {
        id: 'r1q5',
        text: 'What is the largest desert in the world?',
        options: [
          { id: 'A', text: 'The Sahara Desert' },
          { id: 'B', text: 'The Gobi Desert' },
          { id: 'C', text: 'The Arabian Desert' },
          { id: 'D', text: 'The Australian Outback' },
        ],
        correctOptionId: 'A',
      },
      {
        id: 'r1q6',
        text: 'What is the most expensive painting ever sold?',
        options: [
          { id: 'A', text: 'Mona Lisa' },
          { id: 'B', text: 'Salvator Mundi by Leonardo da Vinci' },
          { id: 'C', text: 'The Starry Night' },
          { id: 'D', text: 'Girl with a Pearl Earring' },
        ],
        correctOptionId: 'B',
      },
      {
        id: 'r1q7',
        text: 'Who is the richest person in the world?',
        options: [
          { id: 'A', text: 'Donald Trump' },
          { id: 'B', text: 'Jeff Bezos' },
          { id: 'C', text: 'Elon Musk' },
          { id: 'D', text: 'La Bubu' },
        ],
        correctOptionId: 'C',
      },
      {
        id: 'r1q8',
        text: 'What is the longest lasting empire in history?',
        options: [
          { id: 'A', text: 'The Egyptian Empire' },
          { id: 'B', text: 'The Roman Empire' },
          { id: 'C', text: 'The British Empire' },
          { id: 'D', text: 'The Byzantine Empire' },
        ],
        correctOptionId: 'B',
      },
      {
        id: 'r1q9',
        text: 'What is the most spoken language in the world?',
        options: [
          { id: 'A', text: 'Mandarin Chinese' },
          { id: 'B', text: 'Hindi' },
          { id: 'C', text: 'English' },
          { id: 'D', text: 'Spanish' },
        ],
        correctOptionId: 'A',
      },
      {
        id: 'r1q10',
        text: 'What is the largest airplane in the world?',
        options: [
          { id: 'A', text: 'Airbus A380' },
          { id: 'B', text: 'Boeing 747' },
          { id: 'C', text: 'The Stratolaunch' },
          { id: 'D', text: 'Antonov An-225' },
        ],
        correctOptionId: 'C',
      },
      {
        id: 'r1q11',
        text: 'What is the world record for the largest pizza ever made? (in square feet)',
        options: [
          { id: 'A', text: '10,300 square feet' },
          { id: 'B', text: '100,000 square feet' },
          { id: 'C', text: '13,580.28 square feet' },
          { id: 'D', text: '10 square feet' },
        ],
        correctOptionId: 'C',
      },
      {
        id: 'r1q12',
        text: 'Who is the youngest person to climb Mount Everest?',
        options: [
          { id: 'A', text: 'Junko Tabei' },
          { id: 'B', text: 'Jordan Romero' },
          { id: 'C', text: 'Edmund Hillary' },
          { id: 'D', text: 'Tenzing Norgay' },
        ],
        correctOptionId: 'B',
      },
      {
        id: 'r1q13',
        text: 'What is the fastest production car in the world?',
        options: [
          { id: 'A', text: 'Bugatti Chiron Super Sport 300+' },
          { id: 'B', text: 'Ferrari SF90 Stradale' },
          { id: 'C', text: 'Lamborghini Aventador' },
          { id: 'D', text: 'McLaren Speedtail' },
        ],
        correctOptionId: 'A',
      },
      {
        id: 'r1q14',
        text: 'What is the hottest chili pepper in the world?',
        options: [
          { id: 'A', text: 'Californian Grim Reaper' },
          { id: 'B', text: 'Carolina Reaper' },
          { id: 'C', text: 'Australian Bird\'s Eye' },
          { id: 'D', text: 'Mexican Jalapeño' },
        ],
        correctOptionId: 'B',
      },
    ],
  },
  {
    id: 'round2',
    name: 'Australian Animals',
    emoji: '🦘',
    description: 'How well do you know Australia\'s amazing wildlife?',
    questions: [
      {
        id: 'r2q1',
        text: "What is the name of Australia's national bird?",
        options: [
          { id: 'A', text: 'The Koala (not a bird though!)' },
          { id: 'B', text: 'The Kookaburra' },
          { id: 'C', text: 'The Emu' },
          { id: 'D', text: 'The Ibis (Bin Chicken)' },
        ],
        correctOptionId: 'C',
      },
      {
        id: 'r2q2',
        text: 'What is the average lifespan of a koala?',
        options: [
          { id: 'A', text: '10 years' },
          { id: 'B', text: '22 years' },
          { id: 'C', text: '15 years' },
          { id: 'D', text: '700 years' },
        ],
        correctOptionId: 'C',
      },
      {
        id: 'r2q3',
        text: 'What is the largest living marsupial in the world?',
        options: [
          { id: 'A', text: 'Platypus' },
          { id: 'B', text: 'Wombat' },
          { id: 'C', text: 'The Red Kangaroo' },
          { id: 'D', text: 'The Eastern Grey Kangaroo' },
        ],
        correctOptionId: 'C',
      },
      {
        id: 'r2q4',
        text: 'What is the heaviest flightless bird in Australia?',
        options: [
          { id: 'A', text: 'Emu' },
          { id: 'B', text: 'Kookaburra' },
          { id: 'C', text: 'Cassowary' },
          { id: 'D', text: 'Penguin' },
        ],
        correctOptionId: 'C',
      },
      {
        id: 'r2q5',
        text: 'Found along the northern coastlines of Australia, name the most venomous marine animal alive?',
        options: [
          { id: 'A', text: 'Piranha' },
          { id: 'B', text: 'Irukandji Jellyfish' },
          { id: 'C', text: 'The Box Jellyfish' },
          { id: 'D', text: 'Great White Shark' },
        ],
        correctOptionId: 'C',
      },
      {
        id: 'r2q6',
        text: 'What name is given to a baby koala?',
        options: [
          { id: 'A', text: 'Cub' },
          { id: 'B', text: 'Dave' },
          { id: 'C', text: 'Joey' },
          { id: 'D', text: 'Kit' },
        ],
        correctOptionId: 'C',
      },
      {
        id: 'r2q7',
        text: 'Which Australian animal is most famously found on Rottnest Island in Western Australia?',
        options: [
          { id: 'A', text: 'The Quokka' },
          { id: 'B', text: 'The Black Swan' },
          { id: 'C', text: 'The Saltwater Crocodile' },
          { id: 'D', text: 'The Dingo' },
        ],
        correctOptionId: 'A',
      },
      {
        id: 'r2q8',
        text: 'What are the two types of crocodile found in Australia?',
        options: [
          { id: 'A', text: 'Saltwater and Freshwater' },
          { id: 'B', text: 'Nile and Saltwater' },
          { id: 'C', text: 'King and Queen Crocodile' },
          { id: 'D', text: 'Big and Bigger' },
        ],
        correctOptionId: 'A',
      },
      {
        id: 'r2q9',
        text: 'What black and white bird is most feared for its swooping between August and October?',
        options: [
          { id: 'A', text: 'Penguin' },
          { id: 'B', text: 'Cockatoo' },
          { id: 'C', text: 'Magpie' },
          { id: 'D', text: 'Pied Butcherbird' },
        ],
        correctOptionId: 'C',
      },
      {
        id: 'r2q10',
        text: "Which marsupial is considered Australia's Easter Bunny?",
        options: [
          { id: 'A', text: 'Koala' },
          { id: 'B', text: 'Kangaroo' },
          { id: 'C', text: 'The Bilby' },
          { id: 'D', text: 'Platypus' },
        ],
        correctOptionId: 'C',
      },
      {
        id: 'r2q11',
        text: 'Which Australian animal appears on the 5 cent coin?',
        options: [
          { id: 'A', text: 'The Echidna' },
          { id: 'B', text: 'Platypus' },
          { id: 'C', text: 'Kangaroo' },
          { id: 'D', text: 'Kookaburra' },
        ],
        correctOptionId: 'A',
      },
      {
        id: 'r2q12',
        text: 'What type of animal is a sugar glider?',
        options: [
          { id: 'A', text: 'A type of possum (marsupial)' },
          { id: 'B', text: 'A type of bird' },
          { id: 'C', text: 'A bat' },
          { id: 'D', text: 'A flying squirrel' },
        ],
        correctOptionId: 'A',
      },
      {
        id: 'r2q13',
        text: 'Which marsupial is known for its square-shaped poo?',
        options: [
          { id: 'A', text: 'Kangaroo' },
          { id: 'B', text: 'Platypus' },
          { id: 'C', text: 'Wombat' },
          { id: 'D', text: 'Koala' },
        ],
        correctOptionId: 'C',
      },
      {
        id: 'r2q14',
        text: 'Besides the Kangaroo, which other Australian animal carries its babies in a pouch?',
        options: [
          { id: 'A', text: 'Koala' },
          { id: 'B', text: 'Dingo' },
          { id: 'C', text: 'Kookaburra' },
          { id: 'D', text: 'Crocodile' },
        ],
        correctOptionId: 'A',
      },
      {
        id: 'r2q15',
        text: 'True or false: crocodiles existed at the same time as dinosaurs?',
        options: [
          { id: 'A', text: 'TRUE — 100%!' },
          { id: 'B', text: 'False — crocs came later' },
          { id: 'C', text: 'Only the saltwater ones' },
          { id: 'D', text: 'Only in Australia' },
        ],
        correctOptionId: 'A',
      },
    ],
  },
  {
    id: 'round3',
    name: 'Animals',
    emoji: '🐾',
    description: 'Amazing facts about animals from around the world!',
    questions: [
      {
        id: 'r3q1',
        text: 'What is the slowest animal in the world?',
        options: [
          { id: 'A', text: 'Three-toed Sloth' },
          { id: 'B', text: 'Tortoise' },
          { id: 'C', text: 'Snail' },
          { id: 'D', text: 'Dada (on a Sunday morning)' },
        ],
        correctOptionId: 'A',
      },
      {
        id: 'r3q2',
        text: 'What is the smallest animal in the world?',
        options: [
          { id: 'A', text: 'Ant' },
          { id: 'B', text: 'Myxozoa (microscopic parasite)' },
          { id: 'C', text: 'Bee Hummingbird' },
          { id: 'D', text: 'Pygmy Shrew' },
        ],
        correctOptionId: 'B',
      },
      {
        id: 'r3q3',
        text: 'What is the fastest bird in the world?',
        options: [
          { id: 'A', text: 'Bald Eagle' },
          { id: 'B', text: 'Peregrine Falcon' },
          { id: 'C', text: 'Common Swift' },
          { id: 'D', text: 'Albatross' },
        ],
        correctOptionId: 'B',
      },
      {
        id: 'r3q4',
        text: 'What is the fastest insect in the world?',
        options: [
          { id: 'A', text: 'Dragonfly' },
          { id: 'B', text: 'Australian Tiger Beetle' },
          { id: 'C', text: 'Horsefly' },
          { id: 'D', text: 'Bumblebee' },
        ],
        correctOptionId: 'B',
      },
      {
        id: 'r3q5',
        text: 'How many years can a snail sleep for?',
        options: [
          { id: 'A', text: '5 years' },
          { id: 'B', text: '2 years' },
          { id: 'C', text: '3 years' },
          { id: 'D', text: '4 years' },
        ],
        correctOptionId: 'C',
      },
      {
        id: 'r3q6',
        text: 'Which mammal has no vocal chords?',
        options: [
          { id: 'A', text: 'Whale' },
          { id: 'B', text: 'Giraffe' },
          { id: 'C', text: 'Lion' },
          { id: 'D', text: 'Elephant' },
        ],
        correctOptionId: 'B',
      },
      {
        id: 'r3q7',
        text: 'What is a female donkey called?',
        options: [
          { id: 'A', text: 'A Jenny' },
          { id: 'B', text: 'A Mare' },
          { id: 'C', text: 'A Doe' },
          { id: 'D', text: 'Poop Face' },
        ],
        correctOptionId: 'A',
      },
      {
        id: 'r3q8',
        text: 'How many bones does a shark have?',
        options: [
          { id: 'A', text: '208' },
          { id: 'B', text: '55' },
          { id: 'C', text: '0 — they have cartilage!' },
          { id: 'D', text: '19' },
        ],
        correctOptionId: 'C',
      },
      {
        id: 'r3q9',
        text: 'How many clams can a Walrus eat in a single day?',
        options: [
          { id: 'A', text: '19' },
          { id: 'B', text: '5,000' },
          { id: 'C', text: '2,500' },
          { id: 'D', text: '354' },
        ],
        correctOptionId: 'B',
      },
      {
        id: 'r3q10',
        text: 'What is a baby rabbit called?',
        options: [
          { id: 'A', text: 'A Puppy' },
          { id: 'B', text: 'A Kit' },
          { id: 'C', text: 'A Foal' },
          { id: 'D', text: 'A Cub' },
        ],
        correctOptionId: 'B',
      },
    ],
  },
  {
    id: 'round4',
    name: 'Countries',
    emoji: '🗺️',
    description: 'How well do you know the countries of the world?',
    questions: [
      {
        id: 'r4q1',
        text: 'What is the richest country in the world?',
        options: [
          { id: 'A', text: 'USA' },
          { id: 'B', text: 'Switzerland' },
          { id: 'C', text: 'Luxembourg' },
          { id: 'D', text: 'Norway' },
        ],
        correctOptionId: 'C',
      },
      {
        id: 'r4q2',
        text: 'Which country is Kim Jong-un the leader of?',
        options: [
          { id: 'A', text: 'South Korea' },
          { id: 'B', text: 'North Korea' },
          { id: 'C', text: 'China' },
          { id: 'D', text: 'Japan' },
        ],
        correctOptionId: 'B',
      },
      {
        id: 'r4q3',
        text: 'How many countries share a border with France?',
        options: [
          { id: 'A', text: '6' },
          { id: 'B', text: '7' },
          { id: 'C', text: '8' },
          { id: 'D', text: '9' },
        ],
        correctOptionId: 'C',
      },
      {
        id: 'r4q4',
        text: 'How many countries are there in the world?',
        options: [
          { id: 'A', text: '193' },
          { id: 'B', text: '195' },
          { id: 'C', text: '197' },
          { id: 'D', text: '200' },
        ],
        correctOptionId: 'B',
      },
      {
        id: 'r4q5',
        text: 'What country is the biggest in the world by land size?',
        options: [
          { id: 'A', text: 'Canada' },
          { id: 'B', text: 'China' },
          { id: 'C', text: 'USA' },
          { id: 'D', text: 'Russia' },
        ],
        correctOptionId: 'D',
      },
      {
        id: 'r4q6',
        text: 'What is the smallest country in the world by land size?',
        options: [
          { id: 'A', text: 'Monaco' },
          { id: 'B', text: 'San Marino' },
          { id: 'C', text: 'Vatican City' },
          { id: 'D', text: 'Liechtenstein' },
        ],
        correctOptionId: 'C',
      },
      {
        id: 'r4q7',
        text: 'What is the primary native language of Peru?',
        options: [
          { id: 'A', text: 'Portuguese' },
          { id: 'B', text: 'Spanish' },
          { id: 'C', text: 'Quechua' },
          { id: 'D', text: 'French' },
        ],
        correctOptionId: 'B',
      },
      {
        id: 'r4q8',
        text: 'Which country is credited with inventing pasta?',
        options: [
          { id: 'A', text: 'Italy' },
          { id: 'B', text: 'France' },
          { id: 'C', text: 'China' },
          { id: 'D', text: 'Greece' },
        ],
        correctOptionId: 'C',
      },
      {
        id: 'r4q9',
        text: 'Which country invented the Hamburger?',
        options: [
          { id: 'A', text: 'USA' },
          { id: 'B', text: 'France' },
          { id: 'C', text: 'Germany' },
          { id: 'D', text: 'England' },
        ],
        correctOptionId: 'C',
      },
      {
        id: 'r4q10',
        text: 'How many countries are on the European continent?',
        options: [
          { id: 'A', text: '40' },
          { id: 'B', text: '44' },
          { id: 'C', text: '50' },
          { id: 'D', text: '47' },
        ],
        correctOptionId: 'B',
      },
    ],
  },
  {
    id: 'round5',
    name: 'Sports',
    emoji: '⚽',
    description: "Think you know your sports? Let's find out!",
    questions: [
      {
        id: 'r5q1',
        text: 'Which country has won the most FIFA Soccer World Cups?',
        options: [
          { id: 'A', text: 'Germany' },
          { id: 'B', text: 'Argentina' },
          { id: 'C', text: 'Italy' },
          { id: 'D', text: 'Brazil' },
        ],
        correctOptionId: 'D',
      },
      {
        id: 'r5q2',
        text: 'Which country/countries won the most gold medals at the 2024 Paris Olympics?',
        options: [
          { id: 'A', text: 'USA only' },
          { id: 'B', text: 'China only' },
          { id: 'C', text: 'USA and China — they tied!' },
          { id: 'D', text: 'Australia' },
        ],
        correctOptionId: 'C',
      },
      {
        id: 'r5q3',
        text: 'Who holds the world record as the fastest woman over 100 metres?',
        options: [
          { id: 'A', text: "Sha'Carri Richardson" },
          { id: 'B', text: 'Florence Griffith-Joyner (Flo-Jo)' },
          { id: 'C', text: 'Shelly-Ann Fraser-Pryce' },
          { id: 'D', text: 'Elaine Thompson-Herah' },
        ],
        correctOptionId: 'B',
      },
      {
        id: 'r5q4',
        text: 'How many Grand Slams has Serena Williams won?',
        options: [
          { id: 'A', text: '17' },
          { id: 'B', text: '20' },
          { id: 'C', text: '23' },
          { id: 'D', text: '19' },
        ],
        correctOptionId: 'C',
      },
      {
        id: 'r5q5',
        text: 'What is the largest number of hot dogs sold at a Baseball game?',
        options: [
          { id: 'A', text: '75,000' },
          { id: 'B', text: '60,000' },
          { id: 'C', text: '15,000' },
          { id: 'D', text: '55,000' },
        ],
        correctOptionId: 'A',
      },
      {
        id: 'r5q6',
        text: 'What is the record for the most goals scored by one player in a single EPL season?',
        options: [
          { id: 'A', text: '30 goals' },
          { id: 'B', text: '29 goals' },
          { id: 'C', text: '36 goals' },
          { id: 'D', text: '32 goals' },
        ],
        correctOptionId: 'C',
      },
      {
        id: 'r5q7',
        text: 'What is the dress code colour for players at Wimbledon?',
        options: [
          { id: 'A', text: 'Blue' },
          { id: 'B', text: 'White' },
          { id: 'C', text: 'Red' },
          { id: 'D', text: 'A splash of green' },
        ],
        correctOptionId: 'B',
      },
      {
        id: 'r5q8',
        text: 'Who has scored the most three-pointers in NBA history?',
        options: [
          { id: 'A', text: 'Ray Allen' },
          { id: 'B', text: 'Klay Thompson' },
          { id: 'C', text: 'James Harden' },
          { id: 'D', text: 'Steph Curry' },
        ],
        correctOptionId: 'D',
      },
      {
        id: 'r5q9',
        text: 'What is the fastest recorded volleyball serve speed?',
        options: [
          { id: 'A', text: '70 km/h' },
          { id: 'B', text: '109 km/h' },
          { id: 'C', text: '88 km/h' },
          { id: 'D', text: '138 km/h' },
        ],
        correctOptionId: 'D',
      },
      {
        id: 'r5q10',
        text: 'Which team won the most recent Club World Cup?',
        options: [
          { id: 'A', text: 'Real Madrid' },
          { id: 'B', text: 'Manchester City' },
          { id: 'C', text: 'PSG' },
          { id: 'D', text: 'Chelsea' },
        ],
        correctOptionId: 'D',
      },
    ],
  },
  {
    id: 'round6',
    name: 'Geography',
    emoji: '🧭',
    description: 'Mountains, rivers, and capitals — do you know your geography?',
    questions: [
      {
        id: 'r6q1',
        text: 'What is the tallest mountain in the world?',
        options: [
          { id: 'A', text: 'K2' },
          { id: 'B', text: 'Kilimanjaro' },
          { id: 'C', text: 'Mount Everest' },
          { id: 'D', text: 'Denali' },
        ],
        correctOptionId: 'C',
      },
      {
        id: 'r6q2',
        text: 'What country has the largest population in the world?',
        options: [
          { id: 'A', text: 'China' },
          { id: 'B', text: 'India' },
          { id: 'C', text: 'USA' },
          { id: 'D', text: 'Indonesia' },
        ],
        correctOptionId: 'B',
      },
      {
        id: 'r6q3',
        text: 'What is the longest river in the world?',
        options: [
          { id: 'A', text: 'Amazon' },
          { id: 'B', text: 'Mississippi' },
          { id: 'C', text: 'Nile' },
          { id: 'D', text: 'Yangtze' },
        ],
        correctOptionId: 'C',
      },
      {
        id: 'r6q4',
        text: 'In which American city is the Golden Gate Bridge?',
        options: [
          { id: 'A', text: 'Washington D.C.' },
          { id: 'B', text: 'San Francisco' },
          { id: 'C', text: 'Los Angeles' },
          { id: 'D', text: 'New York' },
        ],
        correctOptionId: 'B',
      },
      {
        id: 'r6q5',
        text: 'What is the capital city of Mexico?',
        options: [
          { id: 'A', text: 'Guadalajara' },
          { id: 'B', text: 'Monterrey' },
          { id: 'C', text: 'Mexico City' },
          { id: 'D', text: 'Cancun' },
        ],
        correctOptionId: 'C',
      },
      {
        id: 'r6q6',
        text: 'What is the only continent with land in all four hemispheres?',
        options: [
          { id: 'A', text: 'Asia' },
          { id: 'B', text: 'South America' },
          { id: 'C', text: 'Africa' },
          { id: 'D', text: 'Australia' },
        ],
        correctOptionId: 'C',
      },
      {
        id: 'r6q7',
        text: 'Which river flows through the Grand Canyon?',
        options: [
          { id: 'A', text: 'Rio Grande' },
          { id: 'B', text: 'Mississippi River' },
          { id: 'C', text: 'Colorado River' },
          { id: 'D', text: 'Missouri River' },
        ],
        correctOptionId: 'C',
      },
      {
        id: 'r6q8',
        text: "Where is Angel Falls, the world's highest waterfall, located?",
        options: [
          { id: 'A', text: 'Brazil' },
          { id: 'B', text: 'Peru' },
          { id: 'C', text: 'Venezuela' },
          { id: 'D', text: 'Ecuador' },
        ],
        correctOptionId: 'C',
      },
      {
        id: 'r6q9',
        text: 'What is the state capital of New York?',
        options: [
          { id: 'A', text: 'New York City' },
          { id: 'B', text: 'Buffalo' },
          { id: 'C', text: 'Albany' },
          { id: 'D', text: 'Syracuse' },
        ],
        correctOptionId: 'C',
      },
      {
        id: 'r6q10',
        text: "On what continent would you find the world's largest desert?",
        options: [
          { id: 'A', text: 'Africa (the Sahara)' },
          { id: 'B', text: 'Asia' },
          { id: 'C', text: 'Antarctica' },
          { id: 'D', text: 'Australia' },
        ],
        correctOptionId: 'C',
      },
    ],
  },
  {
    id: 'round7',
    name: 'Diwali',
    emoji: '🪔',
    description: 'The Festival of Lights — how much do you know?',
    questions: [
      {
        id: 'r7q1',
        text: 'What does the word "Diwali" mean?',
        options: [
          { id: 'A', text: 'Festival of Colours' },
          { id: 'B', text: 'Row of Lights' },
          { id: 'C', text: 'Festival of Fire' },
          { id: 'D', text: 'Celebration of Harvest' },
        ],
        correctOptionId: 'B',
      },
      {
        id: 'r7q2',
        text: 'Which Hindu epic is associated with the celebration of Diwali?',
        options: [
          { id: 'A', text: 'Mahabharata' },
          { id: 'B', text: 'Ramayana' },
          { id: 'C', text: 'The Vedas' },
          { id: 'D', text: 'Bhagavad Gita' },
        ],
        correctOptionId: 'B',
      },
      {
        id: 'r7q3',
        text: 'During Diwali, why is it significant to light diyas (clay lamps)?',
        options: [
          { id: 'A', text: 'To keep away insects' },
          { id: 'B', text: 'To symbolise the victory of light over darkness' },
          { id: 'C', text: 'To honour ancestors' },
          { id: 'D', text: 'To welcome the rain' },
        ],
        correctOptionId: 'B',
      },
      {
        id: 'r7q4',
        text: 'Which Hindu goddess is worshipped for wealth and prosperity during Diwali?',
        options: [
          { id: 'A', text: 'Saraswati' },
          { id: 'B', text: 'Durga' },
          { id: 'C', text: 'Lakshmi' },
          { id: 'D', text: 'Parvati' },
        ],
        correctOptionId: 'C',
      },
      {
        id: 'r7q5',
        text: 'Besides India, which other countries celebrate Diwali?',
        options: [
          { id: 'A', text: 'Only India celebrates it' },
          { id: 'B', text: 'Nepal, Sri Lanka, Malaysia and Singapore' },
          { id: 'C', text: 'India and Pakistan only' },
          { id: 'D', text: 'India and China' },
        ],
        correctOptionId: 'B',
      },
      {
        id: 'r7q6',
        text: 'What is the other name for Diwali?',
        options: [
          { id: 'A', text: 'Holi' },
          { id: 'B', text: 'Navratri' },
          { id: 'C', text: 'Deepavali' },
          { id: 'D', text: 'Pongal' },
        ],
        correctOptionId: 'C',
      },
      {
        id: 'r7q7',
        text: 'What is the significance of lighting fireworks during Diwali?',
        options: [
          { id: 'A', text: 'To scare away evil spirits' },
          { id: 'B', text: "To celebrate Lord Rama's return to Ayodhya" },
          { id: 'C', text: 'To honour the god of fire' },
          { id: 'D', text: "Just because it's fun!" },
        ],
        correctOptionId: 'B',
      },
      {
        id: 'r7q8',
        text: 'What type of food is commonly eaten during Diwali?',
        options: [
          { id: 'A', text: 'Grilled meats' },
          { id: 'B', text: 'Fried foods like samosas or pakoras' },
          { id: 'C', text: 'Fresh salads' },
          { id: 'D', text: 'Soup' },
        ],
        correctOptionId: 'B',
      },
      {
        id: 'r7q9',
        text: 'Why do people clean their homes before Diwali?',
        options: [
          { id: 'A', text: 'To make room for guests' },
          { id: 'B', text: 'To welcome Goddess Lakshmi and invite prosperity' },
          { id: 'C', text: 'Ancient tradition with no specific meaning' },
          { id: 'D', text: 'To clean up after the monsoon season' },
        ],
        correctOptionId: 'B',
      },
      {
        id: 'r7q10',
        text: 'How many days does Diwali last?',
        options: [
          { id: 'A', text: 'One day' },
          { id: 'B', text: 'Three days' },
          { id: 'C', text: 'Five days' },
          { id: 'D', text: 'Two weeks' },
        ],
        correctOptionId: 'C',
      },
    ],
  },
];
