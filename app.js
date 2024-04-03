const express = require('express')
const app = express()
const path = require('path')
const sqlite3 = require('sqlite3')
const {open} = require('sqlite')
app.use(express.json())
const dbPath = path.join(__dirname, 'covid19India.db')
let db = null;
const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server Runnin At http://localhost:3000/')
    })
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
    process.exit(1)
  }
}
initializeDBAndServer()
const convertStateDbObjectToResponseObject = dbObject => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  }
}
const convertDistrictDbObjectToResponseObject = dbObject => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  }
}

app.get('/states/', async (request, response) => {
  const getAllStatesList = `
    SELECT 
    *
    FROM
    state
    ORDER BY 
    state_id;`
  const statesArray = await db.all(getAllStatesList)
  response.send(
    statesArray.map(stateobject =>
      convertStateDbObjectToResponseObject(stateobject),
    ),
  )
})

app.get('/states/:stateId/', async (request, response) => {
  const {stateId} = request.params
  const stateQuery = `
  SELECT
  *
  FROM 
  state
  WHERE
  state_id= ${stateId};`
  const stateDetails = await db.get(stateQuery)
  response.send(convertStateDbObjectToResponseObject(stateDetails))
})

app.post('/districts/', async (request, response) => {
  const newDistrict = request.body
  const {districtName, stateId, cases, cured, active, deaths} = newDistrict
  const addNewDistrict = `
  INSERT 
  INTO
  district
    (district_name,
    state_id,
    cases,
    cured,
    active,
    deaths)
  VALUES(
    '${districtName}',
    '${stateId}',
    '${cases}',
    '${cured}',
    '${active}',
    '${deaths}')`
  const dbResponse = await db.run(addNewDistrict)
  const newDistrictDetails = dbResponse.lastID
  response.send('District Successfully Added')
})

app.get('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const districtDetails = `
  SELECT
  *
  FROM 
  district
  WHERE
  district_id= ${districtId};`
  const districtArray = await db.get(districtDetails)
  response.send(convertDistrictDbObjectToResponseObject(districtArray))
})

app.delete('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const deleteDistrict = `
  DELETE
  FROM
  district
  WHERE
  district_id= ${districtId};`
  await db.run(deleteDistrict)
  response.send('District Removed')
})

app.put('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const {districtName, stateId, cases, cured, active, deaths} = request.body
  const updateDistrictQuery = `
  UPDATE
  district
  SET
    district_name= '${districtName}',
    state_id= ${stateId},
    cases= ${cases},
    cured= ${cured},
    active= ${active},
    deaths= ${deaths}
  WHERE
      district_id= ${districtId};`
  await db.run(updateDistrictQuery)
  response.send('District Details Updated')
})
app.get('/states/:stateId/stats/', async (request, response) => {
  const {stateId} = request.params
  const getStateStatsQuery = `
  SELECT
  SUM(cases),
  SUM(cured),
  SUM(active),
  SUM(deaths),
  FROM 
  district
  WHERE
   state_id= ${stateId};`
  const stats = await db.get(getStateStatsQuery)
  console.log(stats)
  response.send({
    totalCases: stats['SUM(cases)'],
    totalCured: stats['SUM(cured)'],
    totalActive: stats['SUM(active)'],
    totalDeaths: stats['SUM(deaths)'],
  })
})

app.get('/districts/:districtId/details/', async (request, response) => {
  const {districtId} = request.params
  const getDistrictDetailsQuery = `
  SELECT
   state_id
   FROM 
   district
   WHERE
   district_id= ${districtId};`
  const convertDistrictDbObjectToResponseObject = await db.get(
    getDistrictDetailsQuery,
  )
  const getStateNameQuery = `
   SELECT
   state_name as stateName 
   FROM 
   state
   WHERE 
   state_id= ${convertDistrictDbObjectToResponseObject.state_id};`
  const convertStateDbObjectToResponseObject = await db.get(getStateNameQuery)
  response.send(convertStateDbObjectToResponseObject)
})
module.exports = app
