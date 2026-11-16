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
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
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
        ProblemDetails: {
            detail?: null | string;
            instance?: null | string;
            /** Format: int32 */
            status?: number | null;
            title?: null | string;
            type?: null | string;
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
    EnableUser: {
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
        };
    };
}
