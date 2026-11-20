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
         * @description Where a day falls against the validity of a Contract; derived, never stored
         *     (PRD §5.4).
         * @enum {unknown}
         */
        ContractStatus: "Current" | "Upcoming" | "Expired";
        /** @description A vehicle rate of a contract as the API returns it, with the vehicle it is for. */
        ContractVehicleRateDto: {
            /**
             * Format: double
             * @description The day price.
             */
            dayPrice: number;
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
            /**
             * Format: uuid
             * @description The vehicle the rate is for.
             */
            vehicleId: string;
            /** @description The vehicle's status: a decommissioned vehicle keeps its vehicle rate. */
            vehicleStatus: components["schemas"]["VehicleStatus"];
        };
        /**
         * @description One vehicle rate of a contract request: the vehicle and the seven rate members, as sent. Every
         *     member is optional here so that a missing or misplaced value is reported by
         *     ContractRequestValidation on its own key, `VehicleRates[i].Member`.
         */
        ContractVehicleRateRequest: {
            /** Format: double */
            dayPrice: number | null;
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
            vehicleId: null | string;
        };
        /**
         * @description Request body for `POST /api/registry/customers/{customerId}/contracts` (PRD §5.4, RF-16).
         *     Every member but the end of the validity, the seven rate members and the vehicle rates is required; an empty set
         *     of documents is valid and duplicates collapse. The rate members are required for a flat-rate
         *     contract (the night ones with the night surcharge, the minimum ones as its rule asks) and must
         *     be absent for any other billing level, as must the vehicle rates, an absent list being an empty one.
         */
        CreateContractRequest: {
            billingLevel: null | components["schemas"]["BillingLevel"];
            /** Format: double */
            dayPrice: number | null;
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
         * @description A document a Contract asks for. The declaration order is the canonical order of
         *     a set of required documents (PRD §5.4).
         * @enum {unknown}
         */
        RequiredDocument: "DeliveryNote" | "DeliverySlip" | "WasteForm" | "DailySummary";
        /** @description Request body for `POST /api/identity/auth/revoke` (self-service logout). */
        RevokeRequest: {
            refreshToken: string;
        };
        /** @enum {unknown} */
        SortDirection: "Ascending" | "Descending" | null;
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
