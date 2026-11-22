/** How people see a location outside the list: "<name>, <municipality>". */
export const locationLabel = (location: { name: string; municipality: string }): string =>
  `${location.name}, ${location.municipality}`;
