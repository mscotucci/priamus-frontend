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
    "/api/registry/customers/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
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
        ProblemDetails: {
            detail?: null | string;
            instance?: null | string;
            /** Format: int32 */
            status?: number | null;
            title?: null | string;
            type?: null | string;
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
        /** @description Request body for `POST /api/identity/auth/revoke` (self-service logout). */
        RevokeRequest: {
            refreshToken: string;
        };
        /** @enum {unknown} */
        SortDirection: "Ascending" | "Descending" | null;
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
