interface DriverName {
  firstName: string;
  lastName: string;
}

/** "<first name> <last name>": messages, titles and toasts. */
export const fullName = (driver: DriverName): string => `${driver.firstName} ${driver.lastName}`;

/** "<last name> <first name>": the list column, the order the list is sorted by. */
export const listName = (driver: DriverName): string => `${driver.lastName} ${driver.firstName}`;

/** The user name proposed for a driver's account: "g.ciccone"; empty while either name is empty. */
export const proposeUsername = (firstName: string, lastName: string): string => {
  const clean = (name: string) =>
    name
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, '');
  const first = clean(firstName);
  const last = clean(lastName);
  const initial = first.match(/[a-z0-9]/)?.[0];
  return initial === undefined || last === '' ? '' : `${initial}.${last}`;
};
