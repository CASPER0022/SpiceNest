// Blog articles. Each post is a list of content blocks that BlogPost.jsx renders.
// Block types: p, h2 (needs an id for the table of contents), quote, image, explorer
// (the interactive Spice Route map and timeline), facts, spices, quiz, cta.
// Text may use **bold**. Add a new post by adding an object to this list; the newest date shows first.

export const BLOG_POSTS = [
  {
    slug: 'the-spice-route-from-idukki',
    title: 'The Spice Route: How Kerala’s Spices Changed the World',
    excerpt:
      'For more than two thousand years, pepper and cardamom from the hills behind the Malabar coast pulled ships across oceans. Follow the Spice Route from Idukki to Rome, Venice and Lisbon, and back to your kitchen.',
    date: '2026-11-16',
    readMinutes: 8,
    author: 'Idukki Origins',
    tags: ['History', 'Spice Route', 'Black Pepper', 'Cardamom'],
    cover: '/images/homepage/homepage-bg2.jpg',
    coverAlt: 'Green spice hills of Idukki, Kerala',
    blocks: [
      {
        type: 'p',
        text: 'Long before there were airports, shipping containers or online shops, the world already wanted what grows in the hills of Idukki. Black pepper and green cardamom from the Western Ghats were carried down to the coast of Kerala, loaded onto ships, and sold in markets thousands of kilometres away. The roads and sea lanes they travelled are what we now call **the Spice Route**.'
      },
      {
        type: 'p',
        text: 'This is the story of that route: who sailed it, what they paid, and why a handful of small, dried berries from Kerala ended up shaping empires.'
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
        type: 'p',
        text: 'The trade grew enormously after Rome took Egypt in 30 BCE. Greek and Roman sailors learned to use the **monsoon winds**: blowing towards India in summer and back towards Arabia in winter, they let ships cross the open Arabian Sea instead of hugging the coast. The *Periplus of the Erythraean Sea*, a sailors’ guide from the first century CE, describes ships coming to the Malabar coast “because of the great quantity of pepper”.'
      },
      {
        type: 'p',
        text: 'Their main port was **Muziris**, near today’s Kodungallur, north of Kochi. Roman coins have been found across South India, and excavations at **Pattanam** near Kodungallur have uncovered Mediterranean pottery that many historians link to Muziris.'
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
      { type: 'facts' },
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
      { type: 'quiz' },
      { type: 'cta' }
    ]
  }
];

export const getPost = (slug) => BLOG_POSTS.find((post) => post.slug === slug);

export const sortedPosts = () => [...BLOG_POSTS].sort((a, b) => b.date.localeCompare(a.date));

export const formatPostDate = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
