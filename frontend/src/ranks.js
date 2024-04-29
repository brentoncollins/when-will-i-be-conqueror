export const ranks = [
    {name: 'Bronze I', points: 300, max_width: 1200,color: 'Bronze', filename: 'https://www.when-will-i-be-conqueror.com/images/bronze_1.svg'},
    {name: 'Bronze II', points: 400, max_width: 500,color: 'Bronze', filename: 'https://www.when-will-i-be-conqueror.com/images/bronze_2.svg'},
    {name: 'Bronze III', points: 500, max_width: 300,color: 'Bronze', filename: 'https://www.when-will-i-be-conqueror.com/images/bronze_3.svg'},
    {name: 'Silver I', points: 600, max_width: 1200,color: 'Silver', filename: 'https://www.when-will-i-be-conqueror.com/images/silver_1.svg'},
    {name: 'Silver II', points: 650, max_width: 500,color: 'Silver', filename: 'https://www.when-will-i-be-conqueror.com/images/silver_2.svg'},
    {name: 'Silver III', points: 700, max_width: 300,color: 'Silver', filename: 'https://www.when-will-i-be-conqueror.com/images/silver_3.svg'},
    {name: 'Gold I', points: 800, max_width: 1200,color: 'Gold', filename: 'https://www.when-will-i-be-conqueror.com/images/gold_1.svg'},
    {name: 'Gold II', points: 850, max_width: 500,color: 'Gold', filename: 'https://www.when-will-i-be-conqueror.com/images/gold_2.svg'},
    {name: 'Gold III', points: 900, max_width: 300,color: 'Gold', filename: 'https://www.when-will-i-be-conqueror.com/images/gold_3.svg'},
    {name: 'Platinum I', points: 1000, max_width: 1200,color: 'Platinum', filename: 'https://www.when-will-i-be-conqueror.com/images/platinum_1.svg'},
    {name: 'Platinum II', points: 1050, max_width: 500,color: 'Platinum', filename: 'https://www.when-will-i-be-conqueror.com/images/platinum_2.svg'},
    {name: 'Platinum III', points: 1100, max_width: 300,color: 'Platinum', filename: 'https://www.when-will-i-be-conqueror.com/images/platinum_3.svg'},
    {name: 'Diamond I', points: 1200, max_width: 1200,color: 'Blue', filename: 'https://www.when-will-i-be-conqueror.com/images/diamond_1.svg'},
    {name: 'Diamond II', points: 1250, max_width: 500,color: 'Blue', filename: 'https://www.when-will-i-be-conqueror.com/images/diamond_2.svg'},
    {name: 'Diamond III', points: 1300, max_width: 300,color: 'Blue', filename: 'https://www.when-will-i-be-conqueror.com/images/diamond_3.svg'},
    {name: 'Conqueror I', points: 1400, max_width: 1200,color: 'Yellow', filename: 'https://www.when-will-i-be-conqueror.com/images/conqueror_1.svg'},
    {name: 'Conqueror II', points: 1500, max_width: 500,color: 'Yellow', filename: 'https://www.when-will-i-be-conqueror.com/images/conqueror_2.svg'},
    {name: 'Conqueror III', points: 1600, max_width: 300,color: 'Red', filename: 'https://www.when-will-i-be-conqueror.com/images/conqueror_3.svg'}
];

export const ranksToOptions = (ranks) => {
    return ranks.map(rank => ({
        value: rank.points,
        label: rank.name
    }));
}