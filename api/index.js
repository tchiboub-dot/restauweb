const app = require('../server');
const db = require('../db');

module.exports = async (req, res) => {
  try{
    await db.ready;
  }catch(err){
    console.error('DB not ready', err);
    res.status(500).json({error:{message:'DB not ready', code:'DB_ERROR'}});
    return;
  }

  // Express app is a request handler function; call it directly in serverless environment
  return app(req, res);
};
