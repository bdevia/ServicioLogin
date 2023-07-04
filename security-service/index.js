const express = require('express');
const fs = require('fs');
const app = express();
const port = 5000;

const kafka = require('kafka-node');
const client = new kafka.KafkaClient({kafkaHost: 'kafka:9092'});
const consumer = new kafka.Consumer(client, [{ topic: "System_login", partition: 0 }] );

const users_data = []; 

consumer.on('message', function(message){
  const data = JSON.parse(message.value);
  console.log(data);
  if(foundIndex(data.user) < 0){
    const newUser = {
      user: data.user,
      countFall: 0,
      time: 0,
      lastTimeStamp: 0 
    };
    users_data.push(newUser);
  }
  const indice = foundIndex(data.user);

  if(data.status){
    users_data[indice].countFall = 0;
    users_data[indice].time = 0;
    users_data[indice].lastTimeStamp = 0; 

  } 
  else{
    users_data[indice].countFall++; 
    if(users_data[indice].countFall == 1){
      users_data[indice].lastTimeStamp = data.timeStamp;
    }
    users_data[indice].time = users_data[indice].time + (data.timeStamp - users_data[indice].lastTimeStamp);
    users_data[indice].lastTimeStamp = Date.now();

    if(users_data[indice].countFall >= 5 && users_data[indice].time <= 60000){

      fs.readFile('users_blocked.json', (err, data) => {
        if(err) throw err;
        const users_blocked = JSON.parse(data);

        if(users_blocked.find(element => element == users_data[indice].user)){
          console.log(users_data[indice].user+" Ya Esta Bloqueado");
        }
        else{
          console.log(users_data[indice].user+" Fue Bloqueado");
          users_blocked.push(users_data[indice].user);
          fs.writeFile('users_blocked.json', JSON.stringify(users_blocked, null, 2), (err) => {
            if (err) throw err;
            console.log('Data written to file');
          });
        }
      });
    }
    console.log(users_data[indice].countFall+"  "+ users_data[indice].time);
  }

});

app.get('/', (req, res) => {
    res.send('Sistema de Seguridad Funcionando!');
});

app.get('/blocked', (req, res) => {
  fs.readFile('users_blocked.json', (err, data) => {
    if(err) throw err;
    res.json({users_blocked: JSON.parse(data)});
  });
});

app.listen(port, async function(){
  console.log(`Security Service listening on port ${port}`);
});

function foundIndex(user){
  for(var i=0; i<users_data.length; i++){
    if(users_data[i].user == user){
      return i;
    }
  }
  return -1;
};