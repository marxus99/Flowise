import 'reflect-metadata'
import path from 'path'
import * as fs from 'fs'
import { DataSource } from 'typeorm'
import { getUserHome } from './utils'
import { entities } from './database/entities'
import { sqliteMigrations } from './database/migrations/sqlite'
import { mysqlMigrations } from './database/migrations/mysql'
import { mariadbMigrations } from './database/migrations/mariadb'
import { postgresMigrations } from './database/migrations/postgres'
import logger from './utils/logger'

let appDataSource: DataSource

const parsePostgresUrl = (url: string) => {
    const urlObj = new URL(url)
    return {
        host: urlObj.hostname,
        port: parseInt(urlObj.port) || 5432,
        username: urlObj.username,
        password: urlObj.password,
        database: urlObj.pathname.slice(1) // Remove leading slash
    }
}

export const init = async (): Promise<DataSource> => {
    let homePath
    let flowisePath = path.join(getUserHome(), '.flowise')
    if (!fs.existsSync(flowisePath)) {
        fs.mkdirSync(flowisePath)
    }
    switch (process.env.DATABASE_TYPE) {
        case 'sqlite':
            homePath = process.env.DATABASE_PATH ?? flowisePath
            appDataSource = new DataSource({
                type: 'sqlite',
                database: path.resolve(homePath, 'database.sqlite'),
                synchronize: false,
                migrationsRun: false,
                entities: Object.values(entities),
                migrations: sqliteMigrations
            })
            break
        case 'mysql':
            appDataSource = new DataSource({
                type: 'mysql',
                host: process.env.DATABASE_HOST,
                port: parseInt(process.env.DATABASE_PORT || '3306'),
                username: process.env.DATABASE_USER,
                password: process.env.DATABASE_PASSWORD,
                database: process.env.DATABASE_NAME,
                charset: 'utf8mb4',
                synchronize: false,
                migrationsRun: false,
                entities: Object.values(entities),
                migrations: mysqlMigrations,
                ssl: getDatabaseSSLFromEnv()
            })
            break
        case 'mariadb':
            appDataSource = new DataSource({
                type: 'mariadb',
                host: process.env.DATABASE_HOST,
                port: parseInt(process.env.DATABASE_PORT || '3306'),
                username: process.env.DATABASE_USER,
                password: process.env.DATABASE_PASSWORD,
                database: process.env.DATABASE_NAME,
                charset: 'utf8mb4',
                synchronize: false,
                migrationsRun: false,
                entities: Object.values(entities),
                migrations: mariadbMigrations,
                ssl: getDatabaseSSLFromEnv()
            })
            break
        case 'postgres': {
            let postgresConfig
            if (process.env.DATABASE_URL) {
                // Parse DATABASE_URL for services like Render, Heroku, etc.
                postgresConfig = parsePostgresUrl(process.env.DATABASE_URL)
                logger.info(`🔗 [server]: Using DATABASE_URL for PostgreSQL connection to ${postgresConfig.host}:${postgresConfig.port}`)
            } else {
                // Use individual environment variables
                postgresConfig = {
                    host: process.env.DATABASE_HOST,
                    port: parseInt(process.env.DATABASE_PORT || '5432'),
                    username: process.env.DATABASE_USER,
                    password: process.env.DATABASE_PASSWORD,
                    database: process.env.DATABASE_NAME
                }
            }

            if (!postgresConfig.host || !postgresConfig.username || !postgresConfig.password || !postgresConfig.database) {
                throw new Error('PostgreSQL configuration incomplete: Missing required connection parameters')
            }

            appDataSource = new DataSource({
                type: 'postgres',
                host: postgresConfig.host,
                port: postgresConfig.port,
                username: postgresConfig.username,
                password: postgresConfig.password,
                database: postgresConfig.database,
                ssl: getDatabaseSSLFromEnv(),
                synchronize: false,
                migrationsRun: false,
                entities: Object.values(entities),
                migrations: postgresMigrations,
                extra: {
                    idleTimeoutMillis: 120000
                },
                logging: ['error', 'warn', 'info', 'log'],
                logger: 'advanced-console',
                logNotifications: true,
                poolErrorHandler: (err) => {
                    logger.error(`Database pool error: ${JSON.stringify(err)}`)
                },
                applicationName: 'Flowise'
            })
            break
        }
        default:
            homePath = process.env.DATABASE_PATH ?? flowisePath
            appDataSource = new DataSource({
                type: 'sqlite',
                database: path.resolve(homePath, 'database.sqlite'),
                synchronize: false,
                migrationsRun: false,
                entities: Object.values(entities),
                migrations: sqliteMigrations
            })
            break
    }
    return appDataSource
}

export function getDataSource(): DataSource {
    if (appDataSource === undefined) {
        throw new Error('DataSource has not been initialized. Please call init() first.')
    }
    return appDataSource
}

export const getDatabaseSSLFromEnv = () => {
    if (process.env.DATABASE_SSL_KEY_BASE64) {
        return {
            rejectUnauthorized: false,
            ca: Buffer.from(process.env.DATABASE_SSL_KEY_BASE64, 'base64')
        }
    } else if (process.env.DATABASE_SSL === 'true') {
        return true
    } else if (process.env.DATABASE_SSL === 'false') {
        return false
    }

    // Default to requiring SSL for external database connections (non-localhost)
    if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost')) {
        return { rejectUnauthorized: false } // Most cloud providers use self-signed certs
    }

    return undefined
}
