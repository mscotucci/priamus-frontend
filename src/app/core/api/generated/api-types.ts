export interface paths {
    "/api/identity/auth/admin/tokens/{tokenId}/revoke": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["AdminRevokeToken"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/identity/auth/login": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["Login"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/identity/auth/refresh": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["Refresh"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/identity/auth/revoke": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["Revoke"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/identity/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["GetCurrentUser"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/identity/users": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["ListUsers"];
        put?: never;
        post: operations["CreateUser"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/identity/users/{id}/disable": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["DisableUser"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/identity/users/{id}/enable": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["EnableUser"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/operations/backoffice/trips": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["ListBackOfficeTrips"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/operations/backoffice/trips/{tripId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["GetBackOfficeTrip"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/operations/driver/answers-check": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["CheckTripAnswers"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/operations/driver/customers": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["ListTripCustomers"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/operations/driver/home": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["GetDriverHome"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/operations/driver/locations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["ListTripLocations"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/operations/driver/my-trips": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["ListMyTrips"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/operations/driver/new-trip": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["GetNewTrip"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/operations/driver/trip-questions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["GetTripQuestions"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/operations/driver/trips/{tripId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["GetTrip"];
        put: operations["AddTrip"];
        post?: never;
        delete: operations["DeleteTrip"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/operations/driver/trips/{tripId}/end": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["EndTrip"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/operations/driver/trips/{tripId}/start": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["StartTrip"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/operations/driver/vehicles": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["ListTripVehicles"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/registry/contracts/simulation": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["SimulatePrice"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/registry/customers": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["ListCustomers"];
        put?: never;
        post: operations["CreateCustomer"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/registry/customers/{customerId}/contracts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["ListContracts"];
        put?: never;
        post: operations["CreateContract"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/registry/customers/{customerId}/contracts/{contractId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["GetContract"];
        put: operations["UpdateContract"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/registry/customers/{customerId}/contracts/{contractId}/change-from-date": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["ChangeContractFromDate"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/registry/customers/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["GetCustomer"];
        put: operations["UpdateCustomer"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/registry/customers/{id}/deactivate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["DeactivateCustomer"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/registry/customers/{id}/reactivate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["ReactivateCustomer"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/registry/drivers": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["ListDrivers"];
        put?: never;
        post: operations["CreateDriver"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/registry/drivers/linkable-accounts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["ListLinkableAccounts"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/registry/drivers/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: operations["UpdateDriver"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/registry/drivers/{id}/deactivate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["DeactivateDriver"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/registry/drivers/{id}/reactivate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["ReactivateDriver"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/registry/locations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["ListLocations"];
        put?: never;
        post: operations["CreateLocation"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/registry/locations/rateable": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["ListRateableLocations"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/registry/locations/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: operations["UpdateLocation"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/registry/locations/{id}/deactivate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["DeactivateLocation"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/registry/locations/{id}/reactivate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["ReactivateLocation"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/registry/night-band": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["GetNightBand"];
        put: operations["UpdateNightBand"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/registry/vehicles": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["ListVehicles"];
        put?: never;
        post: operations["CreateVehicle"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/registry/vehicles/rateable": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["ListRateableVehicles"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/registry/vehicles/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put: operations["UpdateVehicle"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/registry/vehicles/{id}/decommission": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["DecommissionVehicle"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/registry/vehicles/{id}/reactivate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post: operations["ReactivateVehicle"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        /**
         * @description Request body for `PUT /api/operations/driver/trips/{tripId}`. The driver is the session's and
         *     the trip is added on today in Italy, so the body names neither. The customer and the leading vehicle
         *     are required; the trailer and the two locations are optional.
         */
        AddTripRequest: {
            /**
             * Format: uuid
             * @description The customer the trip is done for.
             */
            customerId: null | string;
            /**
             * Format: uuid
             * @description The delivery location; `null` when not named.
             */
            deliveryLocationId: null | string;
            /**
             * Format: uuid
             * @description The pickup location; `null` when not named.
             */
            pickupLocationId: null | string;
            /** @description `true` to start the trip now, in the same act that adds it. */
            start: boolean;
            /**
             * Format: uuid
             * @description The trailer; `null` when none.
             */
            trailerId: null | string;
            /**
             * Format: uuid
             * @description The tractor or standalone vehicle.
             */
            vehicleId: null | string;
        };
        /** @description A driver as the back office names them. */
        BackOfficeDriverDto: {
            /** @description The first name. */
            firstName: string;
            /**
             * Format: uuid
             * @description The driver's identifier.
             */
            id: string;
            /** @description The last name. */
            lastName: string;
        };
        /** @description Every step of the calculation an ended trip was saved with; later changes of the contract never reach it. */
        BackOfficeTripCalculationDto: {
            /**
             * Format: double
             * @description The amount after the minimum rule, before the night call fee.
             */
            amountAfterMinimum: number;
            /**
             * Format: double
             * @description The night call fee added; `null` when none is added.
             */
            appliedNightCallFee: number | null;
            /**
             * Format: double
             * @description The amount before the minimum rule.
             */
            baseAmount: number;
            /**
             * Format: double
             * @description The day price of the rate used.
             */
            dayPrice: number;
            /** @description Whether the trip starts inside the night band. */
            isNight: boolean;
            /**
             * Format: double
             * @description The amount of the minimum rule; `null` when none.
             */
            minimumAmount: number | null;
            /** @description Whether the minimum rule changed the base amount. */
            minimumApplied: boolean;
            /** @description The kind of minimum rule of the rate used. */
            minimumKind: components["schemas"]["TripMinimumKind"];
            /**
             * Format: double
             * @description The overage price of a tiered overage; `null` otherwise.
             */
            minimumOveragePrice: number | null;
            /**
             * Format: double
             * @description The threshold of a tiered overage; `null` otherwise.
             */
            minimumThreshold: number | null;
            /**
             * Format: time
             * @description First minute after that night band.
             */
            nightBandEnd: string;
            /**
             * Format: time
             * @description First minute of the night band the trip was classified with.
             */
            nightBandStart: string;
            /**
             * Format: double
             * @description The night call fee of the rate used; `null` without the night surcharge.
             */
            nightCallFee: number | null;
            /**
             * Format: double
             * @description The night price of the rate used; `null` without the night surcharge.
             */
            nightPrice: number | null;
            /** @description Whether the contract has the night surcharge. */
            nightSurcharge: boolean;
            /**
             * Format: int32
             * @description Minutes, kilograms or kilometres; `null` for a trip priced by trip.
             */
            quantity: number | null;
            rateDelivery: null | components["schemas"]["TripLocationDto"];
            ratePickup: null | components["schemas"]["TripLocationDto"];
            /** @description Where the rate came from. */
            rateSource: components["schemas"]["TripRateSource"];
            rateVehicle: null | components["schemas"]["TripVehicleDto"];
            /**
             * Format: double
             * @description The amount of the trip.
             */
            total: number;
            /**
             * Format: double
             * @description The price used: day or night.
             */
            unitPrice: number;
        };
        /** @description What the ended view adds up, over every trip of the selection and not only the page. */
        BackOfficeTripFigures: {
            /**
             * Format: double
             * @description The sum of their totals.
             */
            amount: number;
            /**
             * Format: int32
             * @description How many distinct customers they are done for.
             */
            customers: number;
            /**
             * Format: int32
             * @description How many trips the selection has.
             */
            trips: number;
        };
        /** @description A trip of the back-office list, in any state; the measure and amount fields exist for an ended trip only. */
        BackOfficeTripListItemDto: {
            /**
             * Format: date-time
             * @description When the trip was added (UTC).
             */
            addedAt: string;
            /** @description The customer. */
            customer: components["schemas"]["TripCustomerDto"];
            /**
             * Format: date
             * @description The day the trip started; `null` while it is planned.
             */
            day: null | string;
            /**
             * Format: int32
             * @description Days left before a planned trip expires; `null` for any other state.
             */
            daysToExpiry: number | null;
            delivery: null | components["schemas"]["TripLocationDto"];
            /** @description The driver. */
            driver: components["schemas"]["BackOfficeDriverDto"];
            /**
             * Format: time
             * @description The end time; `null` until it is ended.
             */
            end: null | string;
            /**
             * Format: uuid
             * @description The trip's identifier.
             */
            id: string;
            measureKind: null | components["schemas"]["TripMeasureKind"];
            /** @description Whether the night price was applied; `null` until the trip is ended. */
            nightPriceApplied: null | boolean;
            /**
             * Format: int64
             * @description The trip number; `null` until it is ended.
             */
            number: number | null;
            pickup: null | components["schemas"]["TripLocationDto"];
            /**
             * Format: int32
             * @description Minutes, kilograms or kilometres; `null` for a trip priced by trip and until it is ended.
             */
            quantity: number | null;
            /**
             * Format: time
             * @description The start time; `null` while it is planned.
             */
            start: null | string;
            /** @description Planned, in progress or ended. */
            state: components["schemas"]["TripState"];
            /**
             * Format: double
             * @description The amount of the trip; `null` until it is ended.
             */
            total: number | null;
            trailer: null | components["schemas"]["TripVehicleDto"];
            /**
             * Format: double
             * @description The unit price the trip was priced with; `null` until it is ended.
             */
            unitPrice: number | null;
            /** @description The tractor or standalone vehicle. */
            vehicle: components["schemas"]["TripVehicleDto"];
        };
        /** @description One page of trips of a view and, for the ended view, the figures of the whole selection. */
        BackOfficeTripListResponse: {
            figures: null | components["schemas"]["BackOfficeTripFigures"];
            /** @description The page. */
            trips: components["schemas"]["PagedResponseOfBackOfficeTripListItemDto"];
        };
        /**
         * @description How finely the rates of a Contract are set, and so which locations a trip must
         *     name (PRD §5.4).
         * @enum {unknown}
         */
        BillingLevel: "FlatRate" | "PerPickupLocation" | "PerDeliveryLocation" | "PerLocationPair";
        /**
         * @description Request body for `POST /api/registry/customers/{customerId}/contracts/{contractId}/change-from-date`:
         *     the members of UpdateContractRequest (the terms as written on the
         *     page, the `Version` the client read) plus the day the changed terms start. The validity
         *     as written is cut at `ChangeFrom`.
         */
        ChangeContractFromDateRequest: {
            billingLevel: null | components["schemas"]["BillingLevel"];
            /** Format: date */
            changeFrom: null | string;
            /** Format: double */
            dayPrice: number | null;
            locationRates: null | components["schemas"]["ContractLocationRateRequest"][];
            /** Format: double */
            minimumAmount: number | null;
            /** Format: double */
            minimumOveragePrice: number | null;
            minimumRule: null | components["schemas"]["MinimumRuleKind"];
            /** Format: double */
            minimumThreshold: number | null;
            /** Format: double */
            nightCallFee: number | null;
            /** Format: double */
            nightPrice: number | null;
            nightSurcharge: null | boolean;
            pricingMode: null | components["schemas"]["PricingMode"];
            requiredDocuments: null | components["schemas"]["RequiredDocument"][];
            /** Format: date */
            validFrom: null | string;
            /** Format: date */
            validTo: null | string;
            vehicleRates: null | components["schemas"]["ContractVehicleRateRequest"][];
            /** Format: int32 */
            version: number | null;
        };
        /**
         * @description Which answers of a trip still hold. An answer that was not sent is `true`: there is nothing to
         *     empty.
         */
        CheckTripAnswersResponse: {
            /** @description The customer is active and has a contract in force today. */
            customer: boolean;
            /** @description The delivery location is active and accepted by the contract in force. */
            delivery: boolean;
            /** @description The pickup location is active and accepted by the contract in force. */
            pickup: boolean;
            /** @description The trailer is active, a trailer, and fits the leading vehicle. */
            trailer: boolean;
            /** @description The leading vehicle is active and a tractor or a standalone vehicle. */
            vehicle: boolean;
        };
        /** @description A contract as the API returns it. */
        ContractDto: {
            /** @description The billing level. */
            billingLevel: components["schemas"]["BillingLevel"];
            /**
             * Format: uuid
             * @description The customer the contract belongs to.
             */
            customerId: string;
            /**
             * Format: double
             * @description The day price; `null` when the contract has no rate.
             */
            dayPrice: number | null;
            /**
             * Format: uuid
             * @description The contract's identifier.
             */
            id: string;
            /** @description The location rates, ordered by pickup then delivery location; empty when the contract has none. */
            locationRates: components["schemas"]["ContractLocationRateDto"][];
            /**
             * Format: double
             * @description The minimum amount M; `null` unless the rule has one.
             */
            minimumAmount: number | null;
            /**
             * Format: double
             * @description The overage price Y; `null` unless the rule is tiered overage.
             */
            minimumOveragePrice: number | null;
            minimumRule: null | components["schemas"]["MinimumRuleKind"];
            /**
             * Format: double
             * @description The threshold X; `null` unless the rule is tiered overage.
             */
            minimumThreshold: number | null;
            /**
             * Format: double
             * @description The night call fee; `null` without the night surcharge or a rate.
             */
            nightCallFee: number | null;
            /**
             * Format: double
             * @description The night price; `null` without the night surcharge or a rate.
             */
            nightPrice: number | null;
            /** @description Whether night trips cost more. */
            nightSurcharge: boolean;
            /** @description The pricing mode. */
            pricingMode: components["schemas"]["PricingMode"];
            /** @description The required documents, in canonical order. */
            requiredDocuments: components["schemas"]["RequiredDocument"][];
            /** @description Where today, in Italian time, falls against the validity; derived, never stored. */
            status: components["schemas"]["ContractStatus"];
            /**
             * Format: date
             * @description First day of the validity.
             */
            validFrom: string;
            /**
             * Format: date
             * @description Last day of the validity, or `null` when the contract is open.
             */
            validTo: null | string;
            /** @description The vehicle rates, ordered by license plate; empty when the contract has none. */
            vehicleRates: components["schemas"]["ContractVehicleRateDto"][];
            /**
             * Format: int32
             * @description Version the client sends back with its next write on this contract.
             */
            version: number;
        };
        /**
         * @description A location rate of a contract as the API returns it, with the locations it is for. A side the
         *     billing level does not use is `null`.
         */
        ContractLocationRateDto: {
            /**
             * Format: double
             * @description The day price.
             */
            dayPrice: number;
            delivery: null | components["schemas"]["RatedLocationDto"];
            /**
             * Format: double
             * @description The minimum amount M; `null` unless the rule has one.
             */
            minimumAmount: number | null;
            /**
             * Format: double
             * @description The overage price Y; `null` unless the rule is tiered overage.
             */
            minimumOveragePrice: number | null;
            /** @description The kind of minimum rule. */
            minimumRule: components["schemas"]["MinimumRuleKind"];
            /**
             * Format: double
             * @description The threshold X; `null` unless the rule is tiered overage.
             */
            minimumThreshold: number | null;
            /**
             * Format: double
             * @description The night call fee; `null` without the night surcharge.
             */
            nightCallFee: number | null;
            /**
             * Format: double
             * @description The night price; `null` without the night surcharge.
             */
            nightPrice: number | null;
            pickup: null | components["schemas"]["RatedLocationDto"];
        };
        /**
         * @description One location rate of a contract request: the pickup and the delivery location the billing level
         *     uses and the seven rate members, as sent. Every member is optional here so that a missing or
         *     misplaced value is reported by ContractRequestValidation on its own key,
         *     `LocationRates[i].Member`.
         */
        ContractLocationRateRequest: {
            /** Format: double */
            dayPrice: number | null;
            /** Format: uuid */
            deliveryLocationId: null | string;
            /** Format: double */
            minimumAmount: number | null;
            /** Format: double */
            minimumOveragePrice: number | null;
            minimumRule: null | components["schemas"]["MinimumRuleKind"];
            /** Format: double */
            minimumThreshold: number | null;
            /** Format: double */
            nightCallFee: number | null;
            /** Format: double */
            nightPrice: number | null;
            /** Format: uuid */
            pickupLocationId: null | string;
        };
        /**
         * @description Where a day falls against the validity of a Contract; derived, never stored
         *     (PRD §5.4).
         * @enum {unknown}
         */
        ContractStatus: "Current" | "Upcoming" | "Expired";
        /**
         * @description A vehicle rate of a contract as the API returns it, with the vehicle and the locations it is for. A
         *     side the billing level does not use is `null`.
         */
        ContractVehicleRateDto: {
            /**
             * Format: double
             * @description The day price.
             */
            dayPrice: number;
            delivery: null | components["schemas"]["RatedLocationDto"];
            /** @description The vehicle's description. */
            description: string;
            /** @description The vehicle's license plate. */
            licensePlate: string;
            /**
             * Format: double
             * @description The minimum amount M; `null` unless the rule has one.
             */
            minimumAmount: number | null;
            /**
             * Format: double
             * @description The overage price Y; `null` unless the rule is tiered overage.
             */
            minimumOveragePrice: number | null;
            /** @description The kind of minimum rule. */
            minimumRule: components["schemas"]["MinimumRuleKind"];
            /**
             * Format: double
             * @description The threshold X; `null` unless the rule is tiered overage.
             */
            minimumThreshold: number | null;
            /**
             * Format: double
             * @description The night call fee; `null` without the night surcharge.
             */
            nightCallFee: number | null;
            /**
             * Format: double
             * @description The night price; `null` without the night surcharge.
             */
            nightPrice: number | null;
            pickup: null | components["schemas"]["RatedLocationDto"];
            /**
             * Format: uuid
             * @description The vehicle the rate is for.
             */
            vehicleId: string;
            /** @description The vehicle's status: a decommissioned vehicle keeps its vehicle rate. */
            vehicleStatus: components["schemas"]["VehicleStatus"];
        };
        /**
         * @description One vehicle rate of a contract request: the vehicle, the pickup and the delivery location the billing
         *     level uses (none on a flat-rate contract) and the seven rate members, as sent. Every
         *     member is optional here so that a missing or misplaced value is reported by
         *     ContractRequestValidation on its own key, `VehicleRates[i].Member`.
         */
        ContractVehicleRateRequest: {
            /** Format: double */
            dayPrice: number | null;
            /** Format: uuid */
            deliveryLocationId: null | string;
            /** Format: double */
            minimumAmount: number | null;
            /** Format: double */
            minimumOveragePrice: number | null;
            minimumRule: null | components["schemas"]["MinimumRuleKind"];
            /** Format: double */
            minimumThreshold: number | null;
            /** Format: double */
            nightCallFee: number | null;
            /** Format: double */
            nightPrice: number | null;
            /** Format: uuid */
            pickupLocationId: null | string;
            /** Format: uuid */
            vehicleId: null | string;
        };
        /**
         * @description Request body for `POST /api/registry/customers/{customerId}/contracts` (PRD §5.4, RF-16).
         *     Every member but the end of the validity, the seven rate members, the vehicle rates and the
         *     location rates is required; an empty set of documents is valid and duplicates collapse. The
         *     rate members are required for a flat-rate contract (the night ones with the night surcharge,
         *     the minimum ones as its rule asks) and must be absent for any other billing level. The location
         *     rates are required, at least one, for any other billing level and must be absent for a flat-rate
         *     contract. A vehicle rate carries no location on a flat-rate contract; on any other level it names
         *     the pickup and delivery location the level uses, of one of the location rates. An absent list is
         *     an empty one.
         */
        CreateContractRequest: {
            billingLevel: null | components["schemas"]["BillingLevel"];
            /** Format: double */
            dayPrice: number | null;
            locationRates: null | components["schemas"]["ContractLocationRateRequest"][];
            /** Format: double */
            minimumAmount: number | null;
            /** Format: double */
            minimumOveragePrice: number | null;
            minimumRule: null | components["schemas"]["MinimumRuleKind"];
            /** Format: double */
            minimumThreshold: number | null;
            /** Format: double */
            nightCallFee: number | null;
            /** Format: double */
            nightPrice: number | null;
            nightSurcharge: null | boolean;
            pricingMode: null | components["schemas"]["PricingMode"];
            requiredDocuments: null | components["schemas"]["RequiredDocument"][];
            /** Format: date */
            validFrom: null | string;
            /** Format: date */
            validTo: null | string;
            vehicleRates: null | components["schemas"]["ContractVehicleRateRequest"][];
        };
        /**
         * @description Request body for `POST /api/registry/customers` (PRD §4, RF-15). Only the company name is
         *     required; an empty VAT number, tax code or address is stored as none. The company name and the
         *     address are measured once trimmed, as the aggregate stores them, so their length is checked in
         *     `Validate` rather than with a length attribute on the raw text.
         */
        CreateCustomerRequest: {
            address: null | string;
            companyName: string;
            taxCode: null | string;
            vatNumber: null | string;
        };
        /** @description Response body for a successful `POST /api/registry/customers` request. */
        CreateCustomerResponse: {
            /** @description The trimmed address, or `null`. */
            address: null | string;
            /** @description The trimmed company name. */
            companyName: string;
            /**
             * Format: uuid
             * @description The newly created customer's identifier.
             */
            id: string;
            /**
             * Format: date-time
             * @description UTC instant of the last change.
             */
            lastModifiedAt: string;
            /** @description The status (always CustomerStatus.Active on creation). */
            status: components["schemas"]["CustomerStatus"];
            /** @description The tax code in normal form, or `null`. */
            taxCode: null | string;
            /** @description The VAT number in normal form, or `null`. */
            vatNumber: null | string;
            /**
             * Format: int32
             * @description Version the client sends back with its next write on this customer.
             */
            version: number;
        };
        /**
         * @description Request body for `POST /api/registry/drivers` (PRD §6.5, RF-24). First and last name are
         *     required; an empty phone number is stored as none and a missing `UserId` means a driver
         *     without an account. Lengths and the phone format are checked in `Validate`, measured once
         *     trimmed as the aggregate stores them.
         */
        CreateDriverRequest: {
            firstName: string;
            lastName: string;
            phone: null | string;
            /** Format: uuid */
            userId: null | string;
        };
        /**
         * @description Request body for `POST /api/registry/locations` (PRD §5.1, RF-23). The name and the
         *     municipality are required; an empty address is stored as none. All three are measured once
         *     trimmed, as the aggregate stores them, so their length is checked in `Validate` rather than
         *     with a length attribute on the raw text.
         */
        CreateLocationRequest: {
            address: null | string;
            municipality: string;
            name: string;
        };
        /** @description Response body for a successful `POST /api/registry/locations` request. */
        CreateLocationResponse: {
            /** @description The trimmed address, or `null`. */
            address: null | string;
            /**
             * Format: uuid
             * @description The newly created location's identifier.
             */
            id: string;
            /**
             * Format: date-time
             * @description UTC instant of the last change.
             */
            lastModifiedAt: string;
            /** @description The trimmed municipality. */
            municipality: string;
            /** @description The trimmed name. */
            name: string;
            /** @description The status (always LocationStatus.Active on creation). */
            status: components["schemas"]["LocationStatus"];
            /**
             * Format: int32
             * @description Version the client sends back with its next write on this location.
             */
            version: number;
        };
        /** @description Request body for `POST /api/identity/users`. */
        CreateUserRequest: {
            password: string;
            role: null | components["schemas"]["UserRole"];
            username: string;
        };
        /** @description Response body for a successful `POST /api/identity/users` request. */
        CreateUserResponse: {
            /**
             * Format: uuid
             * @description The newly created user's identifier.
             */
            id: string;
            /** @description The functional role assigned to the user. */
            role: components["schemas"]["UserRole"];
            /** @description The initial lifecycle status (always UserStatus.Active on creation). */
            status: components["schemas"]["UserStatus"];
            /** @description The normalized username. */
            username: string;
        };
        /**
         * @description Request body for `POST /api/registry/vehicles` (PRD RF-26, RF-27). The description is
         *     measured once trimmed, as the aggregate stores it, so its length is checked in
         *     `Validate` rather than with a length attribute on the raw text.
         */
        CreateVehicleRequest: {
            description: string;
            licensePlate: string;
            requiresTrailer: null | boolean;
            type: null | components["schemas"]["VehicleType"];
        };
        /** @description Response body for a successful `POST /api/registry/vehicles` request. */
        CreateVehicleResponse: {
            /** @description The trimmed description. */
            description: string;
            /**
             * Format: uuid
             * @description The newly created vehicle's identifier.
             */
            id: string;
            /**
             * Format: date-time
             * @description UTC instant of the last change.
             */
            lastModifiedAt: string;
            /** @description The plate in normal form. */
            licensePlate: string;
            /** @description Whether a trip led by this vehicle must name a trailer. */
            requiresTrailer: boolean;
            /** @description The status (always VehicleStatus.Active on creation). */
            status: components["schemas"]["VehicleStatus"];
            /** @description The vehicle type. */
            type: components["schemas"]["VehicleType"];
            /**
             * Format: int32
             * @description Version the client sends back with its next write on this vehicle.
             */
            version: number;
        };
        /** @description A single item in the paginated list of customers. */
        CustomerListItemDto: {
            /** @description The address, or `null`. */
            address: null | string;
            /** @description The company name. */
            companyName: string;
            /**
             * Format: uuid
             * @description The customer's identifier.
             */
            id: string;
            /**
             * Format: date-time
             * @description UTC instant of the last change.
             */
            lastModifiedAt: string;
            /** @description The status. */
            status: components["schemas"]["CustomerStatus"];
            /** @description The tax code in normal form, or `null`. */
            taxCode: null | string;
            /** @description The VAT number in normal form, or `null`. */
            vatNumber: null | string;
            /**
             * Format: int32
             * @description Version the client sends back with its next write on this customer.
             */
            version: number;
        };
        /**
         * @description Whether a Customer can be chosen for new trips and contracts (PRD §4, RF-15).
         * @enum {unknown}
         */
        CustomerStatus: "Active" | "Deactivated";
        /**
         * @description Request body for `POST /api/registry/customers/{id}/deactivate`. `Version` is the version
         *     the client read; the change is refused when the customer has changed since.
         */
        DeactivateCustomerRequest: {
            /** Format: int32 */
            version: number | null;
        };
        /**
         * @description Request body for `POST /api/registry/drivers/{id}/deactivate`. `Version` is the version
         *     the client read; the change is refused when the driver has changed since.
         */
        DeactivateDriverRequest: {
            /** Format: int32 */
            version: number | null;
        };
        /**
         * @description Request body for `POST /api/registry/locations/{id}/deactivate`. `Version` is the version
         *     the client read; the change is refused when the location has changed since.
         */
        DeactivateLocationRequest: {
            /** Format: int32 */
            version: number | null;
        };
        /**
         * @description Request body for `POST /api/registry/vehicles/{id}/decommission`. `Version` is the version
         *     the client read; the change is refused when the vehicle has changed since.
         */
        DecommissionVehicleRequest: {
            /** Format: int32 */
            version: number | null;
        };
        /**
         * @description Request body for `POST /api/identity/users/{id}/disable`. `Version` is the version
         *     the client read; the change is refused when the user has changed since.
         */
        DisableUserRequest: {
            /** Format: int32 */
            version: number | null;
        };
        /**
         * @description The Identity user account a driver is linked to, read from Identity at the time of the request
         *     (ADR 0013).
         */
        DriverAccountDto: {
            /** @description Whether the account is disabled. */
            isDisabled: boolean;
            /**
             * Format: uuid
             * @description Identifier of the user account.
             */
            userId: string;
            /** @description Normalised login name of the account. */
            username: string;
        };
        /** @description A driver as the API returns it (PRD §6.5, RF-24). */
        DriverListItemDto: {
            account: null | components["schemas"]["DriverAccountDto"];
            /** @description The trimmed first name. */
            firstName: string;
            /**
             * Format: uuid
             * @description Identifier of the driver.
             */
            id: string;
            /**
             * Format: date-time
             * @description UTC instant of the last change.
             */
            lastModifiedAt: string;
            /** @description The trimmed last name. */
            lastName: string;
            /** @description The phone number as typed, trimmed, or `null`. */
            phone: null | string;
            /** @description The status. */
            status: components["schemas"]["DriverStatus"];
            /**
             * Format: int32
             * @description Version the client sends back with its next write on this driver.
             */
            version: number;
        };
        /**
         * @description Whether a Driver can be chosen for new trips and can use the driver area
         *     (PRD §6.5, RF-24, RF-25).
         * @enum {unknown}
         */
        DriverStatus: "Active" | "Deactivated";
        /**
         * @description Request body for `POST /api/identity/users/{id}/enable`. `Version` is the version
         *     the client read; the change is refused when the user has changed since.
         */
        EnableUserRequest: {
            /** Format: int32 */
            version: number | null;
        };
        /**
         * @description Request body for `POST /api/operations/driver/trips/{tripId}/end`. The time absent ends the trip
         *     now; the measure the contract asks for is given, the other is not.
         */
        EndTripRequest: {
            /**
             * Format: int32
             * @description The kilograms carried, for a trip measured by weight.
             */
            kilograms: number | null;
            /**
             * Format: int32
             * @description The kilometres driven, for a trip measured by distance.
             */
            kilometres: number | null;
            /**
             * Format: time
             * @description The time the trip ended; `null` to end it now.
             */
            time: null | string;
        };
        /** @description One trip in any state, as the back office reads it: the list's fields, its timeline, what it requires and, once ended, the calculation it was saved with. */
        GetBackOfficeTripResponse: {
            /**
             * Format: date-time
             * @description When the trip was added (UTC).
             */
            addedAt: string;
            calculation: null | components["schemas"]["BackOfficeTripCalculationDto"];
            /** @description The customer. */
            customer: components["schemas"]["TripCustomerDto"];
            /**
             * Format: date
             * @description The day the trip started; `null` while it is planned.
             */
            day: null | string;
            /**
             * Format: int32
             * @description Days left before a planned trip expires; `null` for any other state.
             */
            daysToExpiry: number | null;
            delivery: null | components["schemas"]["TripLocationDto"];
            /** @description The driver. */
            driver: components["schemas"]["BackOfficeDriverDto"];
            /**
             * Format: time
             * @description The end time; `null` until it is ended.
             */
            end: null | string;
            /**
             * Format: date
             * @description The day the end time falls on: the trip day, or the day after when the trip crossed midnight; `null` until it is ended.
             */
            endedOn: null | string;
            /**
             * Format: date
             * @description The day a planned trip expires; `null` for any other state.
             */
            expiresOn: null | string;
            /**
             * Format: uuid
             * @description The trip's identifier.
             */
            id: string;
            measureKind: null | components["schemas"]["TripMeasureKind"];
            /**
             * Format: int64
             * @description The trip number; `null` until it is ended.
             */
            number: number | null;
            pickup: null | components["schemas"]["TripLocationDto"];
            /** @description The documents the trip required, as saved; empty when none. */
            requiredDocuments: string[];
            /**
             * Format: time
             * @description The start time; `null` while it is planned.
             */
            start: null | string;
            /** @description Planned, in progress or ended. */
            state: components["schemas"]["TripState"];
            trailer: null | components["schemas"]["TripVehicleDto"];
            /** @description The tractor or standalone vehicle. */
            vehicle: components["schemas"]["TripVehicleDto"];
        };
        /** @description The signed-in user as the database knows it now. */
        GetCurrentUserResponse: {
            /**
             * Format: uuid
             * @description The linked Registry driver for a `Driver` user; null when unlinked or for any other role.
             */
            driverId: null | string;
            /**
             * Format: uuid
             * @description The user's identifier.
             */
            id: string;
            /** @description The user's role, serialised by name. */
            role: components["schemas"]["UserRole"];
            /** @description The user's normalised user name. */
            username: string;
        };
        /**
         * @description What the driver home shows: the driver's name, the trip in progress, the planned trips, the trips the
         *     driver can repeat and how many trips the driver ended today and in the last seven days.
         */
        GetDriverHomeResponse: {
            /**
             * Format: int32
             * @description How many of the driver's ended trips have a day of today or one of the 6
             *                 days before.
             */
            endedInLastSevenDays: number;
            /**
             * Format: int32
             * @description How many of the driver's ended trips have today as their day.
             */
            endedToday: number;
            /** @description The driver's first name. */
            firstName: string;
            inProgress: null | components["schemas"]["InProgressTripDto"];
            /** @description The driver's last name. */
            lastName: string;
            /** @description The planned trips that have not expired, in the order they were added. */
            planned: components["schemas"]["PlannedTripDto"][];
            /**
             * @description Every repeatable trip of the driver, built from ended trips, the one ended
             *                 last first; the page shows the first four and offers the rest.
             */
            repeatableTrips: components["schemas"]["RepeatableTripDto"][];
        };
        /** @description What "Nuovo viaggio" proposes when it opens. */
        GetNewTripResponse: {
            /** @description Whether the driver has a trip in progress. */
            hasTripInProgress: boolean;
            trailer: null | components["schemas"]["TripVehicleDto"];
            vehicle: null | components["schemas"]["TripVehicleDto"];
        };
        /** @description One trip of the driver and what its page needs besides it. */
        GetTripResponse: {
            /**
             * Format: int32
             * @description For a planned trip, 7 on the day it was added and 0 on its last day;
             *                 `null` otherwise.
             */
            daysToExpiry: number | null;
            endAsks: null | components["schemas"]["TripEndAsks"];
            /**
             * Format: time
             * @description For a planned trip, the end time of the driver's latest trip ended today,
             *                 proposed as the start time; `null` when none ended today and for any other trip.
             */
            proposedStart: null | string;
            /** @description The trip. */
            trip: components["schemas"]["TripDto"];
        };
        /** @description A trip in progress and what its end asks. */
        InProgressTripDto: {
            /** @description What ending it asks of the driver, by the contract of the trip day. */
            endAsks: components["schemas"]["TripEndAsks"];
            /** @description The trip. */
            trip: components["schemas"]["TripDto"];
        };
        /** @description The customers offered today, split as the question shows them. */
        ListTripCustomersResponse: {
            /** @description The other customers, in the order the Registry gives them (by company name). */
            others: components["schemas"]["TripCustomerDto"][];
            /**
             * @description The customers of the driver's latest trips, most recent first, five at most;
             *                 empty when a search text is given.
             */
            recent: components["schemas"]["TripCustomerDto"][];
        };
        /** @description A single item in the paginated list of locations. */
        LocationListItemDto: {
            /** @description The address, or `null`. */
            address: null | string;
            /**
             * Format: uuid
             * @description The location's identifier.
             */
            id: string;
            /**
             * Format: date-time
             * @description UTC instant of the last change.
             */
            lastModifiedAt: string;
            /** @description The municipality. */
            municipality: string;
            /** @description The name. */
            name: string;
            /** @description The status. */
            status: components["schemas"]["LocationStatus"];
            /**
             * Format: int32
             * @description Version the client sends back with its next write on this location.
             */
            version: number;
        };
        /**
         * @description Whether a Location can be chosen for new rates and trips (PRD §5.1).
         * @enum {unknown}
         */
        LocationStatus: "Active" | "Deactivated";
        /** @description Request body for `POST /api/identity/auth/login`. */
        LoginRequest: {
            password: string;
            username: string;
        };
        /** @description Response payload for a successful login. */
        LoginResponse: {
            /** @description Short-lived JWT access token. */
            accessToken: string;
            /**
             * Format: date-time
             * @description UTC expiry of the access token.
             */
            accessTokenExpiresAt: string;
            /** @description Opaque long-lived refresh token (base64url, 43 chars). */
            refreshToken: string;
            /**
             * Format: date-time
             * @description UTC expiry of the refresh token.
             */
            refreshTokenExpiresAt: string;
        };
        /** @enum {unknown} */
        MinimumRuleKind: "None" | "FixedMinimum" | "TieredOverage" | null;
        /** @description The driver's ended trips of the last seven days, without any price. */
        MyTripsResponse: {
            /**
             * Format: date
             * @description The day in Italy the seven days end on.
             */
            today: string;
            /**
             * @description The driver's ended trips whose day is today or one of the 6 days before, the newest
             *                 first (by day, then by start time).
             */
            trips: components["schemas"]["TripDto"][];
        };
        /** @description The system night band as the API shows it. */
        NightBandDto: {
            /** @description First minute after the band, `HH:mm`. */
            end: string;
            /** @description First minute of the band, `HH:mm`. */
            start: string;
            /**
             * Format: int32
             * @description Version to send back with a change.
             */
            version: number;
        };
        /** @description Response envelope for a paginated query. Immutable record. */
        PagedResponseOfBackOfficeTripListItemDto: {
            /** @description The items returned in the current page. */
            data: components["schemas"]["BackOfficeTripListItemDto"][];
            /** @description True when there is a page after this one. */
            hasNextPage?: boolean;
            /** @description True when there is a page before this one. */
            hasPreviousPage?: boolean;
            /**
             * Format: int32
             * @description 1-based page number returned.
             */
            page: number;
            /**
             * Format: int32
             * @description Page size used to compute the result.
             */
            pageSize: number;
            /**
             * Format: int32
             * @description Total number of items across all pages.
             */
            totalCount: number;
            /**
             * Format: int32
             * @description Total number of pages, computed as `ceil(TotalCount / PageSize)`.
             */
            totalPages?: number;
        };
        /** @description Response envelope for a paginated query. Immutable record. */
        PagedResponseOfCustomerListItemDto: {
            /** @description The items returned in the current page. */
            data: components["schemas"]["CustomerListItemDto"][];
            /** @description True when there is a page after this one. */
            hasNextPage?: boolean;
            /** @description True when there is a page before this one. */
            hasPreviousPage?: boolean;
            /**
             * Format: int32
             * @description 1-based page number returned.
             */
            page: number;
            /**
             * Format: int32
             * @description Page size used to compute the result.
             */
            pageSize: number;
            /**
             * Format: int32
             * @description Total number of items across all pages.
             */
            totalCount: number;
            /**
             * Format: int32
             * @description Total number of pages, computed as `ceil(TotalCount / PageSize)`.
             */
            totalPages?: number;
        };
        /** @description Response envelope for a paginated query. Immutable record. */
        PagedResponseOfDriverListItemDto: {
            /** @description The items returned in the current page. */
            data: components["schemas"]["DriverListItemDto"][];
            /** @description True when there is a page after this one. */
            hasNextPage?: boolean;
            /** @description True when there is a page before this one. */
            hasPreviousPage?: boolean;
            /**
             * Format: int32
             * @description 1-based page number returned.
             */
            page: number;
            /**
             * Format: int32
             * @description Page size used to compute the result.
             */
            pageSize: number;
            /**
             * Format: int32
             * @description Total number of items across all pages.
             */
            totalCount: number;
            /**
             * Format: int32
             * @description Total number of pages, computed as `ceil(TotalCount / PageSize)`.
             */
            totalPages?: number;
        };
        /** @description Response envelope for a paginated query. Immutable record. */
        PagedResponseOfLocationListItemDto: {
            /** @description The items returned in the current page. */
            data: components["schemas"]["LocationListItemDto"][];
            /** @description True when there is a page after this one. */
            hasNextPage?: boolean;
            /** @description True when there is a page before this one. */
            hasPreviousPage?: boolean;
            /**
             * Format: int32
             * @description 1-based page number returned.
             */
            page: number;
            /**
             * Format: int32
             * @description Page size used to compute the result.
             */
            pageSize: number;
            /**
             * Format: int32
             * @description Total number of items across all pages.
             */
            totalCount: number;
            /**
             * Format: int32
             * @description Total number of pages, computed as `ceil(TotalCount / PageSize)`.
             */
            totalPages?: number;
        };
        /** @description Response envelope for a paginated query. Immutable record. */
        PagedResponseOfUserListItemDto: {
            /** @description The items returned in the current page. */
            data: components["schemas"]["UserListItemDto"][];
            /** @description True when there is a page after this one. */
            hasNextPage?: boolean;
            /** @description True when there is a page before this one. */
            hasPreviousPage?: boolean;
            /**
             * Format: int32
             * @description 1-based page number returned.
             */
            page: number;
            /**
             * Format: int32
             * @description Page size used to compute the result.
             */
            pageSize: number;
            /**
             * Format: int32
             * @description Total number of items across all pages.
             */
            totalCount: number;
            /**
             * Format: int32
             * @description Total number of pages, computed as `ceil(TotalCount / PageSize)`.
             */
            totalPages?: number;
        };
        /** @description Response envelope for a paginated query. Immutable record. */
        PagedResponseOfVehicleListItemDto: {
            /** @description The items returned in the current page. */
            data: components["schemas"]["VehicleListItemDto"][];
            /** @description True when there is a page after this one. */
            hasNextPage?: boolean;
            /** @description True when there is a page before this one. */
            hasPreviousPage?: boolean;
            /**
             * Format: int32
             * @description 1-based page number returned.
             */
            page: number;
            /**
             * Format: int32
             * @description Page size used to compute the result.
             */
            pageSize: number;
            /**
             * Format: int32
             * @description Total number of items across all pages.
             */
            totalCount: number;
            /**
             * Format: int32
             * @description Total number of pages, computed as `ceil(TotalCount / PageSize)`.
             */
            totalPages?: number;
        };
        /** @description A planned trip and the days left before it expires. */
        PlannedTripDto: {
            /**
             * Format: int32
             * @description 7 on the day it was added, 0 on its last day.
             */
            daysToExpiry: number;
            /** @description The trip. */
            trip: components["schemas"]["TripDto"];
        };
        /** @description A simulated amount with the steps that led to it, as the engine computed them. */
        PriceSimulationDto: {
            /**
             * Format: double
             * @description The amount after the minimum rule, before the night call fee.
             */
            amountAfterMinimum: number;
            /** @description Day or night, by the start time. */
            band: components["schemas"]["TimeBand"];
            /**
             * Format: double
             * @description The amount before the minimum rule.
             */
            baseAmount: number;
            /**
             * Format: double
             * @description The minimum amount M; `null` unless the rule has one.
             */
            minimumAmount: number | null;
            /** @description Whether the minimum rule changed the base amount. */
            minimumApplied: boolean;
            /**
             * Format: double
             * @description The overage price Y; `null` unless the rule is tiered overage.
             */
            minimumOveragePrice: number | null;
            /** @description The kind of minimum rule of the rate chosen. */
            minimumRule: components["schemas"]["MinimumRuleKind"];
            /**
             * Format: double
             * @description The threshold X; `null` unless the rule is tiered overage.
             */
            minimumThreshold: number | null;
            /** @description The night band the trip was classified with. */
            nightBand: components["schemas"]["SimulatedNightBandDto"];
            /**
             * Format: double
             * @description The night call fee added; `null` when none is added.
             */
            nightCallFee: number | null;
            /** @description Whether the terms have the night surcharge. */
            nightSurcharge: boolean;
            /**
             * Format: int32
             * @description Minutes, kilograms or kilometres; `null` for a trip priced by trip.
             */
            quantity: number | null;
            /** @description Where the rate came from. */
            rateSource: components["schemas"]["RateSource"];
            /**
             * Format: double
             * @description The amount: AmountAfterMinimum plus NightCallFee.
             */
            total: number;
            /**
             * Format: double
             * @description The price used: day or night, of the rate chosen.
             */
            unitPrice: number;
            /**
             * Format: uuid
             * @description The vehicle whose rate was used; `null` when no vehicle rate was used.
             */
            vehicleId: null | string;
        };
        /**
         * @description How the amount of a trip is measured under a Contract (PRD §5.4).
         * @enum {unknown}
         */
        PricingMode: "ByHour" | "ByWeight" | "ByDistance" | "ByTrip";
        ProblemDetails: {
            detail?: null | string;
            instance?: null | string;
            /** Format: int32 */
            status?: number | null;
            title?: null | string;
            type?: null | string;
        };
        /**
         * @description Where the rate of a computation came from.
         * @enum {unknown}
         */
        RateSource: "Contract" | "Vehicle" | "Location" | "LocationPair";
        /** @description A location that can be given a location rate in a contract. */
        RateableLocationDto: {
            /**
             * Format: uuid
             * @description The location's identifier.
             */
            id: string;
            /** @description The town the location is in. */
            municipality: string;
            /** @description What people call the place. */
            name: string;
        };
        /** @description A vehicle that can be given a vehicle rate in a contract. */
        RateableVehicleDto: {
            /** @description The description. */
            description: string;
            /**
             * Format: uuid
             * @description The vehicle's identifier.
             */
            id: string;
            /** @description The plate in normal form. */
            licensePlate: string;
        };
        /** @description A location a rate of a contract is for, as the API returns it. */
        RatedLocationDto: {
            /**
             * Format: uuid
             * @description The location's identifier.
             */
            id: string;
            /** @description The location's municipality. */
            municipality: string;
            /** @description The location's name. */
            name: string;
            /** @description The location's status: a deactivated location keeps its rate. */
            status: components["schemas"]["LocationStatus"];
        };
        /**
         * @description Request body for `POST /api/registry/customers/{id}/reactivate`. `Version` is the version
         *     the client read; the change is refused when the customer has changed since.
         */
        ReactivateCustomerRequest: {
            /** Format: int32 */
            version: number | null;
        };
        /**
         * @description Request body for `POST /api/registry/drivers/{id}/reactivate`. `Version` is the version
         *     the client read; the change is refused when the driver has changed since.
         */
        ReactivateDriverRequest: {
            /** Format: int32 */
            version: number | null;
        };
        /**
         * @description Request body for `POST /api/registry/locations/{id}/reactivate`. `Version` is the version
         *     the client read; the change is refused when the location has changed since.
         */
        ReactivateLocationRequest: {
            /** Format: int32 */
            version: number | null;
        };
        /**
         * @description Request body for `POST /api/registry/vehicles/{id}/reactivate`. `Version` is the version
         *     the client read; the change is refused when the vehicle has changed since.
         */
        ReactivateVehicleRequest: {
            /** Format: int32 */
            version: number | null;
        };
        /** @description Request body for `POST /api/identity/auth/refresh`. */
        RefreshRequest: {
            refreshToken: string;
        };
        /** @description Response payload for a successful token refresh. */
        RefreshResponse: {
            /** @description New short-lived JWT access token. */
            accessToken: string;
            /**
             * Format: date-time
             * @description UTC expiry of the new access token.
             */
            accessTokenExpiresAt: string;
            /** @description New opaque refresh token (base64url, 43 chars). The old token is now invalid. */
            refreshToken: string;
            /**
             * Format: date-time
             * @description UTC expiry of the new refresh token.
             */
            refreshTokenExpiresAt: string;
        };
        /**
         * @description What a past trip offers to do again: customer, locations, leading vehicle and trailer, named as the
         *     registry names them now (a decommissioned vehicle keeps its name).
         */
        RepeatableTripDto: {
            /** @description The customer. */
            customer: components["schemas"]["TripCustomerDto"];
            delivery: null | components["schemas"]["TripLocationDto"];
            pickup: null | components["schemas"]["TripLocationDto"];
            trailer: null | components["schemas"]["TripVehicleDto"];
            /** @description The tractor or standalone vehicle. */
            vehicle: components["schemas"]["TripVehicleDto"];
        };
        /**
         * @description A document a Contract asks for. The declaration order is the canonical order of
         *     a set of required documents (PRD §5.4).
         * @enum {unknown}
         */
        RequiredDocument: "DeliveryNote" | "DeliverySlip" | "WasteForm" | "DailySummary";
        /** @description Request body for `POST /api/identity/auth/revoke` (self-service logout). */
        RevokeRequest: {
            refreshToken: string;
        };
        /**
         * @description Request body for `POST /api/registry/contracts/simulation`: the terms of a contract as
         *     written on the page, saved or not, and a sample trip. The billing level, the rate members, the vehicle
         *     rates and the location rates follow the contract requests; `StartTime` and `EndTime` are
         *     `HH:mm`. The end is for a trip by hour
         *     only, `Kilograms` for a trip by weight only and `Kilometres` for a trip by distance only;
         *     the quantities are whole numbers, read as numbers so that a fraction is reported on its own member.
         *     `VehicleId` is the trip's vehicle: `null`, or a vehicle without a vehicle rate on the trip's
         *     location or pair, uses the contract's rate on a flat-rate contract and the rate of the location or pair
         *     on a location level. `PickupLocationId` and `DeliveryLocationId` are the
         *     trip's locations: each is required when the billing level uses it, refused when it does not, and must
         *     have a rate among the written location rates.
         */
        SimulatePriceRequest: {
            billingLevel: null | components["schemas"]["BillingLevel"];
            /** Format: double */
            dayPrice: number | null;
            /** Format: uuid */
            deliveryLocationId: null | string;
            endTime: null | string;
            /** Format: double */
            kilograms: number | null;
            /** Format: double */
            kilometres: number | null;
            locationRates: null | components["schemas"]["ContractLocationRateRequest"][];
            /** Format: double */
            minimumAmount: number | null;
            /** Format: double */
            minimumOveragePrice: number | null;
            minimumRule: null | components["schemas"]["MinimumRuleKind"];
            /** Format: double */
            minimumThreshold: number | null;
            /** Format: double */
            nightCallFee: number | null;
            /** Format: double */
            nightPrice: number | null;
            nightSurcharge: null | boolean;
            /** Format: uuid */
            pickupLocationId: null | string;
            pricingMode: null | components["schemas"]["PricingMode"];
            startTime: string;
            /** Format: uuid */
            vehicleId: null | string;
            vehicleRates: null | components["schemas"]["ContractVehicleRateRequest"][];
        };
        /** @description The night band a simulation classified the trip with. */
        SimulatedNightBandDto: {
            /** @description First minute after the band, `HH:mm`. */
            end: string;
            /** @description First minute of the band, `HH:mm`. */
            start: string;
        };
        /** @enum {unknown} */
        SortDirection: "Ascending" | "Descending" | null;
        /**
         * @description Request body for `POST /api/operations/driver/trips/{tripId}/start`. Both members absent start the
         *     trip now; otherwise both are given, as the day and time the driver typed.
         */
        StartTripRequest: {
            /**
             * Format: date
             * @description The day the trip started; `null` to start it now.
             */
            day: null | string;
            /**
             * Format: time
             * @description The time the trip started; `null` to start it now.
             */
            time: null | string;
        };
        /**
         * @description Whether a trip starts in the night band.
         * @enum {unknown}
         */
        TimeBand: "Day" | "Night";
        /** @description A customer the driver can choose for a trip. */
        TripCustomerDto: {
            /** @description The company name. */
            companyName: string;
            /**
             * Format: uuid
             * @description The customer's identifier.
             */
            id: string;
            /** @description The VAT number; `null` when the customer has none. */
            vatNumber: null | string;
        };
        /**
         * @description A trip in any state, as the driver app receives it: what was answered, named as the registry names it
         *     now, and the times and measures once they exist. It carries no price.
         */
        TripDto: {
            /** @description The customer. */
            customer: components["schemas"]["TripCustomerDto"];
            /**
             * Format: date
             * @description The day the trip started; `null` while it is planned.
             */
            day: null | string;
            delivery: null | components["schemas"]["TripLocationDto"];
            /**
             * Format: time
             * @description The end time; `null` until it is ended.
             */
            end: null | string;
            /**
             * Format: uuid
             * @description The trip's identifier.
             */
            id: string;
            /**
             * Format: int32
             * @description The kilograms carried; `null` unless the trip was measured by weight.
             */
            kilograms: number | null;
            /**
             * Format: int32
             * @description The kilometres driven; `null` unless the trip was measured by distance.
             */
            kilometres: number | null;
            /**
             * Format: int64
             * @description The trip number; `null` until it is ended.
             */
            number: number | null;
            pickup: null | components["schemas"]["TripLocationDto"];
            /**
             * Format: time
             * @description The start time; `null` while it is planned.
             */
            start: null | string;
            /** @description Planned, in progress or ended. */
            state: components["schemas"]["TripState"];
            trailer: null | components["schemas"]["TripVehicleDto"];
            /** @description The tractor or standalone vehicle. */
            vehicle: components["schemas"]["TripVehicleDto"];
        };
        /**
         * @description What the end of a trip still asks of the driver. It names the measure, never the way the contract prices.
         * @enum {unknown}
         */
        TripEndAsks: "Nothing" | "Kilograms" | "Kilometres";
        /** @description A location the driver can pick up from or deliver to. */
        TripLocationDto: {
            /**
             * Format: uuid
             * @description The location's identifier.
             */
            id: string;
            /** @description The municipality it lies in. */
            municipality: string;
            /** @description The name of the place. */
            name: string;
        };
        /**
         * @description Which locations a trip for a customer on a day must name.
         * @enum {unknown}
         */
        TripLocationsAsked: "None" | "Pickup" | "Delivery" | "Both";
        /** @enum {unknown} */
        TripMeasureKind: "StartAndEnd" | "Weight" | "Distance" | "StartOnly" | null;
        /**
         * @description The kind of minimum rule of the rate a trip was priced with.
         * @enum {unknown}
         */
        TripMinimumKind: "None" | "FixedMinimum" | "TieredOverage";
        /** @description A location, or a pair, a contract has a rate for. Only the sides the contract asks for are set. */
        TripPlaceDto: {
            delivery: null | components["schemas"]["TripLocationDto"];
            pickup: null | components["schemas"]["TripLocationDto"];
        };
        /** @description What the contract of a customer today asks of the driver, never its terms. */
        TripQuestionsDto: {
            lastPlace: null | components["schemas"]["TripPlaceDto"];
            /** @description Which locations the contract asks for. */
            locationsAsked: components["schemas"]["TripLocationsAsked"];
            /** @description The locations or pairs the contract offers; empty when it asks for none. */
            places: components["schemas"]["TripPlaceDto"][];
        };
        /**
         * @description Where the rate a trip was priced with came from.
         * @enum {unknown}
         */
        TripRateSource: "Contract" | "Vehicle" | "Location" | "LocationPair";
        /**
         * @description Where a trip is, read from its times alone: it is never stored.
         * @enum {unknown}
         */
        TripState: "Planned" | "InProgress" | "Ended";
        /** @description A vehicle the driver can choose for a trip. */
        TripVehicleDto: {
            /** @description The description, for example make and model. */
            description: string;
            /**
             * Format: uuid
             * @description The vehicle's identifier.
             */
            id: string;
            /** @description Whether it is a tractor, a standalone vehicle or a trailer. */
            kind: components["schemas"]["TripVehicleKind"];
            /** @description The licence plate. */
            licensePlate: string;
            /** @description Whether a tractor must be chosen together with a trailer. */
            requiresTrailer: boolean;
        };
        /**
         * @description What a vehicle is, for the role it can take in a trip.
         * @enum {unknown}
         */
        TripVehicleKind: "Tractor" | "StandaloneVehicle" | "Trailer";
        /** @enum {unknown} */
        TripVehicleRole: "Leading" | "Trailer" | null;
        /**
         * @description Request body for `PUT /api/registry/customers/{customerId}/contracts/{contractId}`
         *     (PRD §5.4, RF-16): the terms of the contract, with its rate members as in
         *     CreateContractRequest, plus the `Version` the client read; the
         *     save is refused when the contract has changed since.
         */
        UpdateContractRequest: {
            billingLevel: null | components["schemas"]["BillingLevel"];
            /** Format: double */
            dayPrice: number | null;
            locationRates: null | components["schemas"]["ContractLocationRateRequest"][];
            /** Format: double */
            minimumAmount: number | null;
            /** Format: double */
            minimumOveragePrice: number | null;
            minimumRule: null | components["schemas"]["MinimumRuleKind"];
            /** Format: double */
            minimumThreshold: number | null;
            /** Format: double */
            nightCallFee: number | null;
            /** Format: double */
            nightPrice: number | null;
            nightSurcharge: null | boolean;
            pricingMode: null | components["schemas"]["PricingMode"];
            requiredDocuments: null | components["schemas"]["RequiredDocument"][];
            /** Format: date */
            validFrom: null | string;
            /** Format: date */
            validTo: null | string;
            vehicleRates: null | components["schemas"]["ContractVehicleRateRequest"][];
            /** Format: int32 */
            version: number | null;
        };
        /**
         * @description Request body for `PUT /api/registry/customers/{id}` (PRD §4, RF-15). `Version` is the
         *     version the client read; the save is refused when the customer has changed since.
         */
        UpdateCustomerRequest: {
            address: null | string;
            companyName: string;
            taxCode: null | string;
            vatNumber: null | string;
            /** Format: int32 */
            version: number | null;
        };
        /**
         * @description Request body for `PUT /api/registry/drivers/{id}` (PRD §6.5, RF-24). `Version` is the
         *     version the client read; the save is refused when the driver has changed since. A missing
         *     `UserId` removes the account link.
         */
        UpdateDriverRequest: {
            firstName: string;
            lastName: string;
            phone: null | string;
            /** Format: uuid */
            userId: null | string;
            /** Format: int32 */
            version: number | null;
        };
        /**
         * @description Request body for `PUT /api/registry/locations/{id}` (PRD §5.1, RF-23). `Version` is the
         *     version the client read; the save is refused when the location has changed since.
         */
        UpdateLocationRequest: {
            address: null | string;
            municipality: string;
            name: string;
            /** Format: int32 */
            version: number | null;
        };
        /**
         * @description Request body for `PUT /api/registry/night-band`. `Start` and `End` are `HH:mm`;
         *     `Version` is the version the client read, and the save is refused when the band has changed since.
         */
        UpdateNightBandRequest: {
            end: string;
            start: string;
            /** Format: int32 */
            version: number | null;
        };
        /**
         * @description Request body for `PUT /api/registry/vehicles/{id}` (PRD RF-26, RF-27). `Version` is the
         *     version the client read; the save is refused when the vehicle has changed since.
         */
        UpdateVehicleRequest: {
            description: string;
            licensePlate: string;
            requiresTrailer: null | boolean;
            type: null | components["schemas"]["VehicleType"];
            /** Format: int32 */
            version: number | null;
        };
        /** @description A single item in the paginated list of users. */
        UserListItemDto: {
            /** Format: date-time */
            createdAt: string;
            /** Format: uuid */
            id: string;
            /** Format: date-time */
            lastModifiedAt: string;
            role: components["schemas"]["UserRole"];
            status: components["schemas"]["UserStatus"];
            username: string;
            /** Format: int32 */
            version: number;
        };
        /**
         * @description Functional role assigned to a User. Drives both back-office
         *     authorization policies and the strict driver/back-office data boundary
         *     (drivers must never see pricing — see `docs/context.md` §1).
         * @enum {unknown}
         */
        UserRole: "Driver" | "BackOffice" | "Admin";
        /**
         * @description Lifecycle state of a User. A disabled user cannot log in and
         *     cannot change password; the back office enables/disables users via dedicated
         *     commands (per RNF-02 revocation requirement).
         * @enum {unknown}
         */
        UserStatus: "Active" | "Disabled";
        /** @description A single item in the paginated list of vehicles. */
        VehicleListItemDto: {
            /** @description The description. */
            description: string;
            /**
             * Format: uuid
             * @description The vehicle's identifier.
             */
            id: string;
            /**
             * Format: date-time
             * @description UTC instant of the last change.
             */
            lastModifiedAt: string;
            /** @description The plate in normal form. */
            licensePlate: string;
            /** @description Whether a trip led by this vehicle must name a trailer. */
            requiresTrailer: boolean;
            /** @description The status. */
            status: components["schemas"]["VehicleStatus"];
            /** @description The vehicle type. */
            type: components["schemas"]["VehicleType"];
            /**
             * Format: int32
             * @description Version the client sends back with its next write on this vehicle.
             */
            version: number;
        };
        /**
         * @description Whether a Vehicle can be chosen for new trips (PRD §6.6, RF-29).
         * @enum {unknown}
         */
        VehicleStatus: "Active" | "Decommissioned";
        /**
         * @description What role a Vehicle can play in a trip (PRD §5.2, RF-26).
         * @enum {unknown}
         */
        VehicleType: "Tractor" | "Trailer" | "StandaloneVehicle";
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    AdminRevokeToken: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                tokenId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description No Content */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    Login: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["LoginRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["LoginResponse"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    Refresh: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RefreshRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RefreshResponse"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    Revoke: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RevokeRequest"];
            };
        };
        responses: {
            /** @description No Content */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    GetCurrentUser: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GetCurrentUserResponse"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    ListUsers: {
        parameters: {
            query?: {
                /** @description Filter by role. When null, all roles are included. */
                role?: components["schemas"]["UserRole"];
                /** @description Filter by status. When null, all statuses are included. */
                status?: components["schemas"]["UserStatus"];
                /**
                 * @description Case-insensitive substring match on string Username.Value.
                 *     When null or whitespace, no username filter is applied.
                 */
                usernameContains?: string;
                /**
                 * @description 1-based page number. Optional on the wire; values below 1 are coerced to 1
                 *     on the setter. Read via int PagedRequest.EffectivePage to get the resolved value
                 *     (defaulting to int PagedRequest.DefaultPage when null).
                 */
                page?: number;
                /**
                 * @description Page size between 1 and int PagedRequest.MaxPageSize. Optional on the wire;
                 *     non-positive values are coerced to int PagedRequest.DefaultPageSize, values
                 *     greater than int PagedRequest.MaxPageSize are clamped to int PagedRequest.MaxPageSize.
                 *     Read via int PagedRequest.EffectivePageSize to get the resolved value
                 *     (defaulting to int PagedRequest.DefaultPageSize when null).
                 */
                pageSize?: number;
                /**
                 * @description Name of the column to sort by. Optional; handlers fall back to a default
                 *     safe column when this is null or not in their whitelist.
                 */
                sortColumn?: string;
                /**
                 * @description Sort direction. Optional on the wire; readers should use
                 *     bool PagedRequest.IsAscending which resolves null to
                 *     SortDirection.Ascending.
                 */
                sortDirection?: components["schemas"]["SortDirection"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PagedResponseOfUserListItemDto"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    CreateUser: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateUserRequest"];
            };
        };
        responses: {
            /** @description Created */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CreateUserResponse"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    DisableUser: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["DisableUserRequest"];
            };
        };
        responses: {
            /** @description No Content */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    EnableUser: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["EnableUserRequest"];
            };
        };
        responses: {
            /** @description No Content */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    ListBackOfficeTrips: {
        parameters: {
            query?: {
                /** @description The view: the state of the trips listed; `Ended` when absent. */
                view?: components["schemas"]["TripState"];
                /** @description First trip day of the period, included; given together with DateOnly? ListBackOfficeTripsRequest.To. */
                from?: string;
                /** @description Last trip day of the period, included; given together with DateOnly? ListBackOfficeTripsRequest.From. */
                to?: string;
                /** @description Only the trips of this customer. */
                customerId?: string;
                /** @description Only the trips of this driver. */
                driverId?: string;
                /** @description Only the trips done with this vehicle as the leading vehicle or as the trailer. */
                vehicleId?: string;
                /** @description Only the trips picking up from or delivering to this location. */
                locationId?: string;
                /** @description Only the trips measured this way. */
                mode?: components["schemas"]["TripMeasureKind"];
                /**
                 * @description Text matched against the trip number (digits only) and the names of the customer, driver, vehicles
                 *     and locations of the trip. When null or whitespace, no search is applied.
                 */
                search?: string;
                /**
                 * @description 1-based page number. Optional on the wire; values below 1 are coerced to 1
                 *     on the setter. Read via int PagedRequest.EffectivePage to get the resolved value
                 *     (defaulting to int PagedRequest.DefaultPage when null).
                 */
                page?: number;
                /**
                 * @description Page size between 1 and int PagedRequest.MaxPageSize. Optional on the wire;
                 *     non-positive values are coerced to int PagedRequest.DefaultPageSize, values
                 *     greater than int PagedRequest.MaxPageSize are clamped to int PagedRequest.MaxPageSize.
                 *     Read via int PagedRequest.EffectivePageSize to get the resolved value
                 *     (defaulting to int PagedRequest.DefaultPageSize when null).
                 */
                pageSize?: number;
                /**
                 * @description Name of the column to sort by. Optional; handlers fall back to a default
                 *     safe column when this is null or not in their whitelist.
                 */
                sortColumn?: string;
                /**
                 * @description Sort direction. Optional on the wire; readers should use
                 *     bool PagedRequest.IsAscending which resolves null to
                 *     SortDirection.Ascending.
                 */
                sortDirection?: components["schemas"]["SortDirection"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BackOfficeTripListResponse"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    GetBackOfficeTrip: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                tripId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GetBackOfficeTripResponse"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    CheckTripAnswers: {
        parameters: {
            query?: {
                /** @description The leading vehicle answered; `null` when none. */
                vehicleId?: string;
                /** @description The trailer answered; `null` when none. */
                trailerId?: string;
                /** @description The customer answered; `null` when none. */
                customerId?: string;
                /** @description The pickup location answered; `null` when none. */
                pickupLocationId?: string;
                /** @description The delivery location answered; `null` when none. */
                deliveryLocationId?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CheckTripAnswersResponse"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    ListTripCustomers: {
        parameters: {
            query?: {
                /**
                 * @description Text matched, ignoring case, against part of the company name or the VAT number. When null or
                 *     whitespace, no search is applied.
                 */
                search?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListTripCustomersResponse"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    GetDriverHome: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GetDriverHomeResponse"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    ListTripLocations: {
        parameters: {
            query?: {
                /**
                 * @description Text matched, ignoring case, against part of the name or the municipality. When null or
                 *     whitespace, no search is applied.
                 */
                search?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TripLocationDto"][];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    ListMyTrips: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MyTripsResponse"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    GetNewTrip: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GetNewTripResponse"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    GetTripQuestions: {
        parameters: {
            query: {
                /** @description The customer the trip is for. */
                customerId: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TripQuestionsDto"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    GetTrip: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                tripId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GetTripResponse"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    AddTrip: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                tripId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AddTripRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TripDto"];
                };
            };
            /** @description Created */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TripDto"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    DeleteTrip: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                tripId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description No Content */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    EndTrip: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                tripId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["EndTripRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TripDto"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    StartTrip: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                tripId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["StartTripRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TripDto"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    ListTripVehicles: {
        parameters: {
            query: {
                /**
                 * @description The role the vehicle is chosen for: `Leading` (tractors and standalone vehicles) or
                 *     `Trailer`.
                 */
                role: components["schemas"]["TripVehicleRole"];
                /**
                 * @description Text matched, ignoring case, against part of the plate or the description. When null or
                 *     whitespace, no search is applied.
                 */
                search?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TripVehicleDto"][];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    SimulatePrice: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SimulatePriceRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PriceSimulationDto"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    ListCustomers: {
        parameters: {
            query?: {
                /**
                 * @description Text matched, ignoring case, against part of the company name; normalised as a VAT number,
                 *     against part of the VAT number; normalised as a tax code, against part of the tax code. When
                 *     null or whitespace, no search is applied.
                 */
                search?: string;
                /** @description Filter by status. When null, all statuses are included. */
                status?: components["schemas"]["CustomerStatus"];
                /**
                 * @description 1-based page number. Optional on the wire; values below 1 are coerced to 1
                 *     on the setter. Read via int PagedRequest.EffectivePage to get the resolved value
                 *     (defaulting to int PagedRequest.DefaultPage when null).
                 */
                page?: number;
                /**
                 * @description Page size between 1 and int PagedRequest.MaxPageSize. Optional on the wire;
                 *     non-positive values are coerced to int PagedRequest.DefaultPageSize, values
                 *     greater than int PagedRequest.MaxPageSize are clamped to int PagedRequest.MaxPageSize.
                 *     Read via int PagedRequest.EffectivePageSize to get the resolved value
                 *     (defaulting to int PagedRequest.DefaultPageSize when null).
                 */
                pageSize?: number;
                /**
                 * @description Name of the column to sort by. Optional; handlers fall back to a default
                 *     safe column when this is null or not in their whitelist.
                 */
                sortColumn?: string;
                /**
                 * @description Sort direction. Optional on the wire; readers should use
                 *     bool PagedRequest.IsAscending which resolves null to
                 *     SortDirection.Ascending.
                 */
                sortDirection?: components["schemas"]["SortDirection"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PagedResponseOfCustomerListItemDto"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    CreateCustomer: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateCustomerRequest"];
            };
        };
        responses: {
            /** @description Created */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CreateCustomerResponse"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    ListContracts: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                customerId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ContractDto"][];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    CreateContract: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                customerId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateContractRequest"];
            };
        };
        responses: {
            /** @description Created */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ContractDto"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    GetContract: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                customerId: string;
                contractId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ContractDto"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    UpdateContract: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                customerId: string;
                contractId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateContractRequest"];
            };
        };
        responses: {
            /** @description No Content */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    ChangeContractFromDate: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                customerId: string;
                contractId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ChangeContractFromDateRequest"];
            };
        };
        responses: {
            /** @description Created */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ContractDto"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    GetCustomer: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CustomerListItemDto"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    UpdateCustomer: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateCustomerRequest"];
            };
        };
        responses: {
            /** @description No Content */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    DeactivateCustomer: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["DeactivateCustomerRequest"];
            };
        };
        responses: {
            /** @description No Content */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    ReactivateCustomer: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ReactivateCustomerRequest"];
            };
        };
        responses: {
            /** @description No Content */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    ListDrivers: {
        parameters: {
            query?: {
                /**
                 * @description Text matched, ignoring case, against part of the first name or of the last name; with
                 *     spaces removed, against part of the phone number with spaces removed. When null or
                 *     whitespace, no search is applied.
                 */
                search?: string;
                /** @description Filter by status. When null, all statuses are included. */
                status?: components["schemas"]["DriverStatus"];
                /**
                 * @description 1-based page number. Optional on the wire; values below 1 are coerced to 1
                 *     on the setter. Read via int PagedRequest.EffectivePage to get the resolved value
                 *     (defaulting to int PagedRequest.DefaultPage when null).
                 */
                page?: number;
                /**
                 * @description Page size between 1 and int PagedRequest.MaxPageSize. Optional on the wire;
                 *     non-positive values are coerced to int PagedRequest.DefaultPageSize, values
                 *     greater than int PagedRequest.MaxPageSize are clamped to int PagedRequest.MaxPageSize.
                 *     Read via int PagedRequest.EffectivePageSize to get the resolved value
                 *     (defaulting to int PagedRequest.DefaultPageSize when null).
                 */
                pageSize?: number;
                /**
                 * @description Name of the column to sort by. Optional; handlers fall back to a default
                 *     safe column when this is null or not in their whitelist.
                 */
                sortColumn?: string;
                /**
                 * @description Sort direction. Optional on the wire; readers should use
                 *     bool PagedRequest.IsAscending which resolves null to
                 *     SortDirection.Ascending.
                 */
                sortDirection?: components["schemas"]["SortDirection"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PagedResponseOfDriverListItemDto"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    CreateDriver: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateDriverRequest"];
            };
        };
        responses: {
            /** @description Created */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DriverListItemDto"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    ListLinkableAccounts: {
        parameters: {
            query?: {
                /**
                 * @description The driver being edited: when it has an account, that account is offered too, even when
                 *     disabled. When null, only the free enabled driver accounts are returned.
                 */
                driverId?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DriverAccountDto"][];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    UpdateDriver: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateDriverRequest"];
            };
        };
        responses: {
            /** @description No Content */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    DeactivateDriver: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["DeactivateDriverRequest"];
            };
        };
        responses: {
            /** @description No Content */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    ReactivateDriver: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ReactivateDriverRequest"];
            };
        };
        responses: {
            /** @description No Content */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    ListLocations: {
        parameters: {
            query?: {
                /**
                 * @description Text matched, ignoring case, against part of the name, the municipality or the address.
                 *     When null or whitespace, no search is applied.
                 */
                search?: string;
                /** @description Filter by status. When null, all statuses are included. */
                status?: components["schemas"]["LocationStatus"];
                /**
                 * @description 1-based page number. Optional on the wire; values below 1 are coerced to 1
                 *     on the setter. Read via int PagedRequest.EffectivePage to get the resolved value
                 *     (defaulting to int PagedRequest.DefaultPage when null).
                 */
                page?: number;
                /**
                 * @description Page size between 1 and int PagedRequest.MaxPageSize. Optional on the wire;
                 *     non-positive values are coerced to int PagedRequest.DefaultPageSize, values
                 *     greater than int PagedRequest.MaxPageSize are clamped to int PagedRequest.MaxPageSize.
                 *     Read via int PagedRequest.EffectivePageSize to get the resolved value
                 *     (defaulting to int PagedRequest.DefaultPageSize when null).
                 */
                pageSize?: number;
                /**
                 * @description Name of the column to sort by. Optional; handlers fall back to a default
                 *     safe column when this is null or not in their whitelist.
                 */
                sortColumn?: string;
                /**
                 * @description Sort direction. Optional on the wire; readers should use
                 *     bool PagedRequest.IsAscending which resolves null to
                 *     SortDirection.Ascending.
                 */
                sortDirection?: components["schemas"]["SortDirection"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PagedResponseOfLocationListItemDto"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    CreateLocation: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateLocationRequest"];
            };
        };
        responses: {
            /** @description Created */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CreateLocationResponse"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    ListRateableLocations: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RateableLocationDto"][];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    UpdateLocation: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateLocationRequest"];
            };
        };
        responses: {
            /** @description No Content */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    DeactivateLocation: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["DeactivateLocationRequest"];
            };
        };
        responses: {
            /** @description No Content */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    ReactivateLocation: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ReactivateLocationRequest"];
            };
        };
        responses: {
            /** @description No Content */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    GetNightBand: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["NightBandDto"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    UpdateNightBand: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateNightBandRequest"];
            };
        };
        responses: {
            /** @description No Content */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    ListVehicles: {
        parameters: {
            query?: {
                /**
                 * @description Text matched, normalised as a plate, against part of the plate, or, ignoring case, against
                 *     part of the description. When null or whitespace, no search is applied.
                 */
                search?: string;
                /** @description Filter by type. When null, all types are included. */
                type?: components["schemas"]["VehicleType"];
                /** @description Filter by status. When null, all statuses are included. */
                status?: components["schemas"]["VehicleStatus"];
                /**
                 * @description 1-based page number. Optional on the wire; values below 1 are coerced to 1
                 *     on the setter. Read via int PagedRequest.EffectivePage to get the resolved value
                 *     (defaulting to int PagedRequest.DefaultPage when null).
                 */
                page?: number;
                /**
                 * @description Page size between 1 and int PagedRequest.MaxPageSize. Optional on the wire;
                 *     non-positive values are coerced to int PagedRequest.DefaultPageSize, values
                 *     greater than int PagedRequest.MaxPageSize are clamped to int PagedRequest.MaxPageSize.
                 *     Read via int PagedRequest.EffectivePageSize to get the resolved value
                 *     (defaulting to int PagedRequest.DefaultPageSize when null).
                 */
                pageSize?: number;
                /**
                 * @description Name of the column to sort by. Optional; handlers fall back to a default
                 *     safe column when this is null or not in their whitelist.
                 */
                sortColumn?: string;
                /**
                 * @description Sort direction. Optional on the wire; readers should use
                 *     bool PagedRequest.IsAscending which resolves null to
                 *     SortDirection.Ascending.
                 */
                sortDirection?: components["schemas"]["SortDirection"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PagedResponseOfVehicleListItemDto"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    CreateVehicle: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateVehicleRequest"];
            };
        };
        responses: {
            /** @description Created */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CreateVehicleResponse"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    ListRateableVehicles: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RateableVehicleDto"][];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    UpdateVehicle: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["UpdateVehicleRequest"];
            };
        };
        responses: {
            /** @description No Content */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    DecommissionVehicle: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["DecommissionVehicleRequest"];
            };
        };
        responses: {
            /** @description No Content */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
    ReactivateVehicle: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ReactivateVehicleRequest"];
            };
        };
        responses: {
            /** @description No Content */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ProblemDetails"];
                };
            };
        };
    };
}
