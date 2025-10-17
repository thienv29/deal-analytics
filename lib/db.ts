import mysql from 'mysql2/promise'

const dbConfig = {
  host: 'localhost',
  port: 3306,
  database: 'digischool2',
  username: 'root',
  password: '123456',
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
