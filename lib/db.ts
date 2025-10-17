import mysql from 'mysql2/promise'

const dbConfig = {
  host: '103.1.236.212',
  port: 3306,
  database: 'admin_digilessondb',
  username: 'admin_digilessondb',
  password: 'eyqGVVG8PQQSaUYREXQB',
}

export async function connectToDatabase() {
  try {
    const connection = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.username,
      password: dbConfig.password,
      database: dbConfig.database,
    })
    return connection
  } catch (error) {
    console.error('Error connecting to database:', error)
    throw error
  }
}
