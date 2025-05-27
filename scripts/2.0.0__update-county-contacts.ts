import { initializeFirebase } from './utils';

const { db } = initializeFirebase(process.argv.slice(2));

if (!db) {
  console.log('Make sure you have set up Application Default Credentials');
  process.exit(1);
}

const countyContacts = {
  beaver: [
    {
      email: 'jamiekelsey@beaver.utah.gov',
      name: 'Jamie Kelsey',
    },
  ],
  'box elder': [
    {
      email: 'cmontgomery@boxeldercounty.org',
      name: 'Chad Montgomery',
    },
  ],
  cache: [
    {
      email: 'Cary.Jenkins@cachecounty.org',
      name: 'Cary Jenkins',
    },
  ],
  carbon: [
    {
      email: 'mellissa.campbell@carbon.utah.gov',
      name: 'Mellissa Campbell',
    },
  ],
  daggett: [
    {
      email: 'bcarter@daggettcounty.org',
      name: 'Brianne Carter',
    },
  ],
  davis: [
    {
      email: 'lmiller@co.davis.ut.us',
      name: 'Max Elliot',
    },
  ],
  duchesne: [
    {
      email: 'allredsurveying@ubtanet.com',
      name: 'Ryan Allred',
    },
  ],
  emery: [
    {
      email: 'Josies@emery.utah.gov',
      name: 'Josie Stilson',
    },
  ],
  garfield: [
    {
      email: 'brayton.talbot@garfield.utah.gov',
      name: 'Brayton D Talbot',
    },
  ],
  grand: [
    {
      email: 'jwmurphy@grandcountyutah.net',
      name: 'James Murphy',
    },
  ],
  iron: [
    {
      email: 'cjeffries@ironcounty.net',
      name: 'Carri Rowley Jeffries',
    },
  ],
  juab: [
    {
      email: 'debbiez@juabcounty.gov',
      name: 'Debra Prisbrey Zirbes',
    },
  ],
  kane: [
    {
      email: 'tglover@kane.utah.gov',
      name: 'Taylor Glover',
    },
  ],
  millard: [
    {
      email: 'sdickens@co.millard.ut.us',
      name: 'Sierra Dickens',
    },
  ],
  morgan: [
    {
      email: 'srose@morgancountyutah.gov',
      name: 'Shaun Rose',
    },
  ],
  piute: [
    {
      email: 'smillett@piute.state.ut.us',
      name: 'Shane Millett',
    },
  ],
  rich: [
    {
      email: 'KBowden@richcountyut.org',
      name: 'Kaia Bowden',
    },
  ],
  'salt lake': [
    {
      email: 'bpark@saltlakecounty.gov',
      name: 'Brad Park',
    },
  ],
  'san juan': [
    {
      email: 'bbunker@sanjuancountyut.gov',
      name: 'Brad Bunker',
    },
  ],
  sanpete: [
    {
      email: 'sancorec@gmail.com',
      name: 'Talisha Johnson',
    },
  ],
  sevier: [
    {
      email: 'jmonroe@sevier.utah.gov',
      name: 'Jason Monroe',
    },
  ],
  summit: [
    {
      email: 'gwolbach@summitcountyutah.gov',
      name: 'Greg Wolbach',
    },
  ],
  tooele: [
    {
      email: 'jhoughton@tooeleco.org',
      name: 'Jerry Houghton',
    },
  ],
  ugrc: [
    {
      email: 'ugrc-plss-administrators@utah.gov',
      name: 'UGRC PLSS Administrators',
    },
  ],
  uintah: [
    {
      email: 'bjs@timberlinels.com',
      name: 'Brock Slaugh',
    },
  ],
  utah: [
    {
      email: 'ucsurvey@utahcounty.gov',
      name: 'Anthony Canto',
    },
  ],
  wasatch: [
    {
      email: 'jkaiserman@co.wasatch.ut.us',
      name: 'James Kaiserman',
    },
  ],
  washington: [
    {
      email: 'mike.draper@washco.utah.gov',
      name: 'Mike Draper',
    },
  ],
  wayne: [
    {
      email: 'colleen@wayne.utah.gov',
      name: 'Colleen Allen',
    },
  ],
  weber: [
    {
      email: 'surveyor@co.weber.ut.us',
      name: 'Leann Kilts',
    },
  ],
};

db.collection('contacts')
  .doc('admin')
  .set(countyContacts)
  .then(() => console.log(`Successfully updated the contacts collection`));
