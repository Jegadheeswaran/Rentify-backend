
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

const authenticationMiddleware = (req,res,next) => {
    const authHeader = req.headers.authorization;
   

    if(!authHeader || !authHeader.startsWith("Bearer ")){
       
       res.status(403).json({message : "Authorization is not present"});
    }

    const token = authHeader.split(" ")[1];

    try{
        const decoded = jwt.verify(token, JWT_SECRET);
      
        if(decoded){
            req.userId = decoded.userId;
            next();
        }
        else{
            return res.status(403).json({message : "incorrect token"});
        }
        
    }
    catch(err){
        return res.status(403).json({message : "incorrect token"});
    }
};


module.exports = {authenticationMiddleware};