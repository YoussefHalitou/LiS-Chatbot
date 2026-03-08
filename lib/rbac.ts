/**
 * Role-Based Access Control (RBAC)
 *
 * Defines user roles and their permissions for database operations.
 * Roles are stored in the t_users.role column and looked up during authentication.
 */

export type UserRole = 'Admin' | 'Secretary' | 'Planner' | 'Supervisor' | 'Worker'

export type Operation = 'read' | 'insert' | 'update' | 'delete'

interface RolePermissions {
    canRead: boolean
    canInsert: boolean
    canUpdate: boolean
    canDelete: boolean
}

/**
 * Permission matrix for each role.
 *
 * Admin:      Full access to all operations
 * Secretary:  Can read, insert, and update — cannot delete
 * Planner:    Can read, insert, and update — cannot delete
 * Supervisor: Can read and insert — cannot update or delete
 * Worker:     Read-only access
 */
export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
    Admin: { canRead: true, canInsert: true, canUpdate: true, canDelete: true },
    Secretary: { canRead: true, canInsert: true, canUpdate: true, canDelete: false },
    Planner: { canRead: true, canInsert: true, canUpdate: true, canDelete: false },
    Supervisor: { canRead: true, canInsert: true, canUpdate: false, canDelete: false },
    Worker: { canRead: true, canInsert: false, canUpdate: false, canDelete: false },
}

/**
 * All valid role names
 */
export const VALID_ROLES = new Set<string>(Object.keys(ROLE_PERMISSIONS))

/**
 * Check whether a given role has permission for an operation.
 *
 * If the role is null or unrecognised, defaults to read-only (Worker-level).
 */
export function checkPermission(role: string | null | undefined, operation: Operation): boolean {
    if (!role || !VALID_ROLES.has(role)) {
        // Unknown or missing role — default to read-only
        return operation === 'read'
    }

    const permissions = ROLE_PERMISSIONS[role as UserRole]

    switch (operation) {
        case 'read':
            return permissions.canRead
        case 'insert':
            return permissions.canInsert
        case 'update':
            return permissions.canUpdate
        case 'delete':
            return permissions.canDelete
        default:
            return false
    }
}

/**
 * Get a user-friendly German error message for permission denial.
 */
export function getPermissionDeniedMessage(role: string | null | undefined, operation: Operation): string {
    const roleLabel = role || 'Unbekannt'
    const operationLabels: Record<Operation, string> = {
        read: 'Lesen',
        insert: 'Erstellen',
        update: 'Aktualisieren',
        delete: 'Löschen',
    }

    return `Keine Berechtigung: Deine Rolle (${roleLabel}) erlaubt kein ${operationLabels[operation]}. Bitte kontaktiere einen Administrator.`
}
