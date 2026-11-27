import type {
  CustomerOptionItem,
  DriverOptionItem,
  LocationOptionItem,
  VehicleOptionItem,
} from './backoffice-trips-api';
import type { SearchFilterOption } from '../../../shared/components/search-filter-menu/search-filter-menu';

export const customerOption = (customer: CustomerOptionItem): SearchFilterOption => ({
  id: customer.id,
  label: customer.companyName,
});

export const driverOption = (driver: DriverOptionItem): SearchFilterOption => ({
  id: driver.id,
  label: `${driver.firstName} ${driver.lastName}`,
});

export const vehicleOption = (vehicle: VehicleOptionItem): SearchFilterOption => ({
  id: vehicle.id,
  label: `${vehicle.licensePlate} ${vehicle.description}`,
});

export const locationOption = (location: LocationOptionItem): SearchFilterOption => ({
  id: location.id,
  label: `${location.name}, ${location.municipality}`,
});
