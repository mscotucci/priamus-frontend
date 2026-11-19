import { fullName, listName, proposeUsername } from './driver-names';

describe('driver names', () => {
  const driver = { firstName: 'Luca', lastName: 'Di Febo' };

  it('fullName reads first name then last name', () => {
    expect(fullName(driver)).toBe('Luca Di Febo');
  });

  it('listName reads last name then first name', () => {
    expect(listName(driver)).toBe('Di Febo Luca');
  });

  it.each([
    ['Gianni', 'Ciccone', 'g.ciccone'],
    ['Marco', "D'Angelo", 'm.dangelo'],
    ['Marco', 'D’Angelo', 'm.dangelo'],
    ['Luca', 'Di Febo', 'l.difebo'],
    ['Èmilio', 'Pérez Müller', 'e.perezmuller'],
    ['  Anna ', ' Rossi ', 'a.rossi'],
    ['Zoë', 'Nguyễn', 'z.nguyen'],
    ['.-Gianni', 'Ciccone', 'g.ciccone'],
  ])('%s %s is proposed as %s', (first, last, expected) => {
    expect(proposeUsername(first, last)).toBe(expected);
  });

  it.each([
    ['', ''],
    ['Gianni', ''],
    ['', 'Ciccone'],
    ['  ', 'Ciccone'],
    ['Gianni', "'"],
  ])('with first name "%s" and last name "%s" the proposal is empty', (first, last) => {
    expect(proposeUsername(first, last)).toBe('');
  });
});
