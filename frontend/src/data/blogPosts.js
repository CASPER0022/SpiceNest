// Blog articles. Each post is a list of content blocks that BlogPost.jsx renders.
// Block types: p, h2 (needs an id for the table of contents), quote, image, explorer
// (the interactive Spice Route map and timeline), facts, spices, quiz, cta.
// Text may use **bold**. Add a new post by adding an object to this list; the newest date shows first.

export const BLOG_POSTS = [
  {
    slug: 'cardamom-cultivation-from-plant-to-plate',
    title: 'From Plant to Plate: How Cardamom Is Grown in Idukki',
    excerpt:
      'Shade trees, monsoon planting, flowers that creep along the ground, hand-picked pods and slow curing: follow every step of cardamom cultivation in the Cardamom Hills, from the forest garden to your cup of chai.',
    // Search-result description (~155 characters); the excerpt is longer
    seoDescription: 'How cardamom is grown in Idukki, Kerala: shade trees, monsoon planting, hand-picking and slow curing, from the farm to your cup of chai.',
    date: '2026-11-16',
    readMinutes: 9,
    author: 'Idukki Origins',
    tags: ['Cardamom', 'Farming', 'How it’s made'],
    cover: '/images/homepage/homepage-bg3.jpg',
    coverAlt: 'Cardamom flower stalks with green pods in an Idukki plantation',
    blocks: [
      {
        type: 'p',
        text: 'Open a pod of good green cardamom and the smell fills the room: sweet, cool and a little like eucalyptus. It is one of the most expensive spices in the world, and once you see how it is grown, it is easy to understand why. Almost every step, from planting to picking to drying, is done by hand.'
      },
      {
        type: 'p',
        text: 'Most of India’s cardamom comes from Kerala, and most of Kerala’s from **Idukki**, where the mountains are still called **the Cardamom Hills**. This is how our farmers grow it, season by season.'
      },
      { type: 'h2', id: 'meet-the-plant', text: 'Meet the queen of spices' },
      {
        type: 'p',
        text: 'Green cardamom (*Elettaria cardamomum*) is a member of the ginger family, native to the evergreen forests of the Western Ghats. Above ground it looks like a clump of tall, leafy shoots. Below ground is a thick stem called a rhizome, from which new shoots and the flowering stalks grow.'
      },
      {
        type: 'p',
        text: 'It is often called **the queen of spices**, next to black pepper, the king. In the kitchen it flavours everything from chai and biryani to payasam and Arabic coffee.'
      },
      {
        type: 'facts',
        items: [
          { front: 'Queen of spices', back: 'Cardamom is called the queen of spices, with black pepper as the king. Both are native to the forests of Kerala.' },
          { front: '~120 days', back: 'How long a cardamom pod takes to ripen after its flower opens. Plants flower and fruit at the same time for months.' },
          { front: '5 : 1', back: 'About five kilos of freshly picked pods dry down to one kilo of the cardamom you buy.' },
          { front: 'By hand', back: 'Pods on one stalk ripen at different times, so every pod is picked by hand, in rounds every few weeks.' }
        ]
      },
      { type: 'h2', id: 'plant-to-plate', text: 'The journey, step by step' },
      {
        type: 'p',
        text: 'Use the buttons, or tap the steps along the top, to follow cardamom from the forest garden to your table.'
      },
      { type: 'journey' },
      { type: 'h2', id: 'where-it-grows', text: 'Why Idukki is perfect for cardamom' },
      {
        type: 'p',
        text: 'Cardamom is fussy. It needs **altitude** (roughly 600 to 1,500 metres), **cool temperatures**, **heavy rain spread over much of the year** and **shade**. Idukki has all four. Two monsoons bring rain from June to December, the hills stay cool, and farmers grow cardamom under the canopy of tall forest trees, much as it once grew wild.'
      },
      {
        type: 'p',
        text: 'Growing under trees also keeps the land healthy: the canopy shelters the soil from heavy rain, fallen leaves become mulch and food for the plants, and the gardens stay home to birds and the bees that pollinate the flowers.'
      },
      {
        type: 'image',
        src: '/images/farmers/raju/farm2.jpg',
        alt: 'Rows of cardamom plants under shade trees on an Idukki hillside',
        caption: 'Cardamom grows best in the dappled shade of forest trees on Idukki’s hillsides.'
      },
      { type: 'h2', id: 'farm-calendar', text: 'A year on the farm' },
      {
        type: 'p',
        text: 'Cardamom work never really stops. The flowering and harvest seasons overlap, so for half the year farmers are picking ripe pods from the same plants that are still flowering.'
      },
      { type: 'calendar' },
      { type: 'h2', id: 'harvest-and-curing', text: 'Harvest and curing: where quality is made' },
      {
        type: 'p',
        text: 'Two things decide how good your cardamom will be: **when it is picked** and **how it is dried**. Pods must be picked when they are fully mature, with black seeds inside, but before they turn yellow. Pickers go along every row, crouching beside each plant, and come back to the same plants every few weeks.'
      },
      {
        type: 'p',
        text: 'The same day, the pods go to the **curing house**. There they are dried slowly over gentle heat for a day or more. Rush it with too much heat and the pods turn pale or split; do it well and they keep their deep green colour and their aroma. That green colour is why the trade still calls Kerala’s best cardamom **“Alleppey Green”**, after the old port it was shipped from.'
      },
      {
        type: 'image',
        src: '/images/blog/cardamom-curing.jpg',
        alt: 'Green cardamom pods drying on wire racks in a curing house',
        caption: 'Fresh pods drying slowly on racks in a curing house, where they keep their green colour.'
      },
      { type: 'h2', id: 'grading', text: 'Sorting by size' },
      {
        type: 'p',
        text: 'After curing, the pods are cleaned of stalks and sieved by size. Larger pods are usually fuller, with more seeds, and fetch higher prices. See how the grades work:'
      },
      { type: 'grades' },
      { type: 'h2', id: 'to-your-table', text: 'From Idukki to your table' },
      {
        type: 'p',
        text: 'Usually, dried cardamom is sold at auction and then passes from trader to wholesaler to shop, sometimes over months. We keep it simple: we buy **directly from our farmers in Idukki**, pack the whole pods by hand, and send them straight to you anywhere in India. Fresher cardamom, and a fairer price for the people who grew it.'
      },
      { type: 'h2', id: 'using-cardamom', text: 'Getting the most from your cardamom' },
      {
        type: 'p',
        text: '**Buy whole pods.** The aroma lives in the oils inside the seeds and fades quickly once ground. Crush a pod lightly just before use, or take out the seeds and grind them fresh.'
      },
      {
        type: 'p',
        text: '**Store it well.** Keep pods in an airtight jar, away from light, heat and moisture. Stored like this, whole cardamom stays fragrant for many months.'
      },
      {
        type: 'p',
        text: '**A little goes a long way.** One or two crushed pods are enough for a pot of chai; a few pods flavour a whole pot of biryani or a pan of payasam.'
      },
      {
        type: 'quiz',
        title: 'How much do you know about cardamom?',
        questions: [
          {
            q: 'Where do cardamom flowers grow?',
            options: ['At the top of the plant', 'On stalks along the ground, from the base', 'On the underside of the leaves'],
            answer: 1,
            why: 'The flowering stalks (panicles) creep out from the base of the clump, close to the ground.'
          },
          {
            q: 'Why is cardamom picked by hand?',
            options: ['Machines are not allowed', 'The pods ripen at different times', 'The plants are too tall'],
            answer: 1,
            why: 'Pods on the same stalk ripen weeks apart, so pickers return every few weeks to take only the ripe ones.'
          },
          {
            q: 'What keeps cured cardamom green?',
            options: ['Slow drying over gentle heat', 'Drying in strong sun', 'Adding colour'],
            answer: 0,
            why: 'Slow, controlled heat in the curing house keeps the green colour and the aroma.'
          }
        ]
      },
      { type: 'spices', only: ['cardamom', 'black-pepper'], title: 'From our farms in Idukki' },
      { type: 'cta', title: 'Fresh green cardamom, straight from Idukki', image: '/images/cardamom/cardamom1.jpg' }
    ]
  },
  {
    slug: 'the-spice-route-from-idukki',
    title: 'The Spice Route: How Kerala’s Spices Changed the World',
    excerpt:
      'For more than two thousand years, pepper and cardamom from the hills behind the Malabar coast pulled ships across oceans. Follow the Spice Route from Idukki to Rome, Venice and Lisbon, and back to your kitchen.',
    seoDescription: 'How pepper and cardamom from the hills of Idukki pulled ships from Rome, Venice and Lisbon to Kerala for 2,000 years: the story of the Spice Route.',
    date: '2026-11-16',
    readMinutes: 8,
    author: 'Idukki Origins',
    tags: ['History', 'Spice Route', 'Black Pepper', 'Cardamom'],
    cover: '/images/blog/spice-route-cover.jpg',
    coverAlt: 'Whole black peppercorns and green cardamom pods from Idukki',
    blocks: [
      {
        type: 'p',
        text: 'Long before there were airports, shipping containers or online shops, the world already wanted what grows in the hills of Idukki. Black pepper and green cardamom from the Western Ghats were carried down to the coast of Kerala, loaded onto ships, and sold in markets thousands of kilometres away. The roads and sea lanes they travelled are what we now call **the Spice Route**.'
      },
      {
        type: 'p',
        text: 'This is the story of that route: who sailed it, what they paid, and why a handful of small, dried berries from Kerala ended up shaping empires.'
      },
      {
        type: 'image',
        src: '/images/blog/pepper-worth-gold.jpg',
        alt: 'An old brass balance with black peppercorns in one pan and gold coins in the other',
        caption: 'Illustration: for centuries, pepper was worth its weight in gold.'
      },
      { type: 'h2', id: 'where-it-began', text: 'Where it began: the hills behind the coast' },
      {
        type: 'p',
        text: 'Black pepper (*Piper nigrum*) is native to the Western Ghats, the long chain of hills that runs down the west of India. Cardamom grows wild in the same forests; the range around Idukki is still called **the Cardamom Hills**. Rain from two monsoons, rich forest soil and cool altitude give these spices their strong aroma.'
      },
      {
        type: 'p',
        text: 'Farmers in the hills dried their harvest in the sun and sent it down rivers such as the **Periyar**, which rises in the Idukki hills, to the trading ports on the coast. From there the spices began a journey that could take a year or more.'
      },
      {
        type: 'image',
        src: '/images/pepper/pepper-1.jpg',
        alt: 'Whole black peppercorns from Idukki',
        caption: 'Sun-dried black pepper from Idukki: the same spice that filled Roman warehouses.'
      },
      { type: 'h2', id: 'explore-the-route', text: 'Explore the route' },
      {
        type: 'p',
        text: 'Pick an era, or tap a moment on the timeline, to see how the route changed over the centuries. Tap any port on the map to learn its part in the story.'
      },
      { type: 'explorer' },
      { type: 'h2', id: 'rome-and-muziris', text: 'Rome, Muziris and the monsoon winds' },
      {
        type: 'p',
        text: 'Pepper was prized very early: black peppercorns were found in the nose of the Egyptian pharaoh **Ramesses II**, who died in 1213 BCE, placed there during mummification. Since pepper grows only in South India, it must already have travelled a very long way.'
      },
      {
        type: 'image',
        src: '/images/blog/pepper-ramesses.jpg',
        alt: 'An embalmer placing black peppercorns beside a wrapped Egyptian mummy in a tomb',
        caption: 'Illustration: peppercorns from South India were used in the mummification of Ramesses II.'
      },
      {
        type: 'p',
        text: 'The trade grew enormously after Rome took Egypt in 30 BCE. Greek and Roman sailors learned to use the **monsoon winds**: blowing towards India in summer and back towards Arabia in winter, they let ships cross the open Arabian Sea instead of hugging the coast. The *Periplus of the Erythraean Sea*, a sailors’ guide from the first century CE, describes ships coming to the Malabar coast “because of the great quantity of pepper”.'
      },
      {
        type: 'p',
        text: 'Their main port was **Muziris**, near today’s Kodungallur, north of Kochi. Roman coins have been found across South India, and excavations at **Pattanam** near Kodungallur have uncovered Mediterranean pottery that many historians link to Muziris.'
      },
      {
        type: 'image',
        src: '/images/blog/malabar-coast-trade.jpg',
        alt: 'Workers carrying sacks of pepper in small boats to a sailing ship anchored off a palm-lined Kerala coast',
        caption: 'Illustration: sacks of pepper ferried out to a trading ship on the Malabar coast.'
      },
      {
        type: 'quote',
        text: 'In no year does India drain our empire of less than fifty million sesterces.',
        cite: 'Pliny the Elder, Natural History, about 77 CE'
      },
      {
        type: 'p',
        text: 'Pliny was complaining that Romans spent fortunes on Eastern luxuries. In 408 CE, when the Goth king Alaric besieged Rome, his ransom demand reportedly included **3,000 pounds of pepper**, alongside gold and silver.'
      },
      {
        type: 'image',
        src: '/images/blog/alaric-pepper-ransom.jpg',
        alt: 'Roman officials handing over chests of gold and sacks of pepper to Gothic warriors at the gates of Rome',
        caption: 'Illustration: Rome pays Alaric’s ransom in gold, silver and pepper, 408 CE.'
      },
      {
        type: 'facts',
        items: [
          { front: 'Black gold', back: 'Pepper was so valuable that it was traded almost like money, and it is still called “black gold” in Kerala.' },
          { front: '2,000+ years', back: 'Kerala’s spices have been traded overseas for more than two thousand years, and peppercorns reached Egypt even earlier.' },
          { front: '3,000 pounds', back: 'The amount of pepper Alaric the Goth reportedly demanded in his ransom for Rome in 408 CE.' },
          { front: '1 round trip a year', back: 'Ships sailed to India on the summer monsoon and home on the winter winds: one voyage there and back each year.' }
        ]
      },
      { type: 'h2', id: 'traders-of-the-middle-ages', text: 'Arab merchants, Chinese fleets and Venice' },
      {
        type: 'p',
        text: 'After Rome, the trade carried on. Arab and Persian merchants sailed between Kerala and the Red Sea and Persian Gulf, and Jewish and Christian trading communities settled along the coast. Spices reached Europe through ports such as Alexandria, where **Venetian** merchants bought them and sold them across Europe at huge profits.'
      },
      {
        type: 'p',
        text: 'A great flood of the Periyar in **1341** is believed to have silted up the old harbour of Muziris and opened a new natural harbour at **Kochi**, which became one of the most important ports on the coast. Further north, **Calicut** (Kozhikode), ruled by the Zamorin, grew into a busy trading city. Between 1405 and 1433 the Chinese admiral **Zheng He** called at Calicut with his great fleets.'
      },
      {
        type: 'p',
        text: 'Calicut was also where spices from further east changed hands. **Cloves** came from the Maluku Islands and **nutmeg and mace** from the tiny Banda Islands in present-day Indonesia, via Malacca. Today these trees also grow in Kerala, including on farms in Idukki.'
      },
      { type: 'spices' },
      { type: 'h2', id: 'the-race-by-sea', text: 'The race for a sea route' },
      {
        type: 'p',
        text: 'European kingdoms wanted to buy spices at the source rather than through Venice and the Middle East. In 1498 the Portuguese explorer **Vasco da Gama** sailed around Africa and landed at Kappad, near Calicut. It opened a direct sea route from Europe to Kerala.'
      },
      {
        type: 'image',
        src: '/images/blog/portuguese-arrival-1498.jpg',
        alt: 'Portuguese sailing ships with red-cross sails anchored off a beach as local fishermen watch boats row ashore',
        caption: 'Illustration: Vasco da Gama’s ships arrive off Kappad, near Calicut, in 1498.'
      },
      {
        type: 'p',
        text: 'What followed was not a peaceful trade. The Portuguese, then the **Dutch** (who captured Kochi in 1663) and later the **British** fought for control of the spice coast, often by force. Kerala’s pepper and cardamom helped pay for the rise of European trading empires.'
      },
      { type: 'h2', id: 'the-route-today', text: 'The Spice Route today' },
      {
        type: 'p',
        text: 'Over the centuries, spices moved through many hands before they reached a kitchen: the farmer, the local trader, the port merchant, the exporter, the wholesaler and the shop. Each one took a share, and the farmer usually received the smallest.'
      },
      {
        type: 'p',
        text: 'At Idukki Origins we keep the route as short as we can. We buy pepper, cardamom, cloves, nutmeg and mace **directly from farmers in Idukki**, pack them by hand, and send them straight to homes across India. The spice is the same one that sailed to Rome; the journey is just a lot shorter now.'
      },
      {
        type: 'quiz',
        title: 'How well do you know the Spice Route?',
        questions: [
          {
            q: 'Which wind did Roman ships use to reach Kerala?',
            options: ['The trade winds of the Atlantic', 'The monsoon winds', 'The Mistral'],
            answer: 1,
            why: 'The summer monsoon carried ships across the Arabian Sea to the Malabar coast; the winter monsoon brought them back.'
          },
          {
            q: 'What was the name of Kerala’s great port in Roman times?',
            options: ['Muziris', 'Malacca', 'Berenike'],
            answer: 0,
            why: 'Muziris, near today’s Kodungallur. Berenike was the Egyptian port where the ships unloaded.'
          },
          {
            q: 'Where did Vasco da Gama land in 1498?',
            options: ['Kochi', 'Goa', 'Kappad, near Calicut'],
            answer: 2,
            why: 'He landed at Kappad beach near Calicut (Kozhikode), opening the sea route from Europe.'
          }
        ]
      },
      { type: 'cta' }
    ]
  }
];

export const getPost = (slug) => BLOG_POSTS.find((post) => post.slug === slug);

export const sortedPosts = () => [...BLOG_POSTS].sort((a, b) => b.date.localeCompare(a.date));

export const formatPostDate = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
