const express = require('express');
const fs = require('fs');
const app = express();
const port = 3000;
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const kafka = require('kafka-node');
const client = new kafka.KafkaClient({kafkaHost: 'kafka:9092'});

var topicsToCreate = [{
  topic: 'System_login',
  partitions: 1,
  replicationFactor: 1
}];

client.createTopics(topicsToCreate, (error, result) => {
  if(error) console.log("Error al crear el topico", error); 
    console.log("Topico creado", result);
});

const producer = new kafka.Producer(client);;

producer.on('ready', function(){
  console.log("Productor conectado a broker kafka");
});

var users = []; // tabla que almacenará los datos de usuarios

app.get('/', (req, res) => {
  res.send('Sistema de Logueo Funcionando');
});

app.post('/login/', (req, res) => {
  fs.readFile('users_blocked.json', (err, data) => {
    if(err) throw err;
    const users_blocked = JSON.parse(data);

    if(users_blocked.find(element => element == req.body.user)){
      res.json({login_status: "Falló ", error: 'user blocked'});
    }
    else{
  
      if(foundIndex(req.body.user) < 0){
        const newUser = {
          user: req.body.user,
          password: req.body.password
        };
        users.push(newUser);
      }
      const status = login(req.body.user, req.body.password);
      const data = {
        user: req.body.user,
        status: true,
        timeStamp: Date.now()
      };
    
      if(!status){
        data.status = false;
      }
    
      const payload = [{ topic: "System_login", messages: JSON.stringify(data)}];
      producer.send(payload, function(error, result) {
        if (error) {      
          console.log( "Sending payload failed: ", error);    
        } else {    
          console.log("Enviado con Exito");    
        }  
      });

      if(status){
        res.json({login_status: 'Exitoso! '});
      } else{

        res.json({login_status: 'Falló ', error: 'contraseña incorrecta'});
      }
    }
  }); 
});

app.listen(port, () => {
  console.log(`Login Service listening on port ${port}`);
});

function foundIndex(user){
  for(var i=0; i<users.length; i++){
    if(users[i].user == user){
      return i;
    }
  }
  return -1;
};

function login(user, password){
  if(users[foundIndex(user)].password == password){
    return true;
  } else{ 
    return false;
  }
};