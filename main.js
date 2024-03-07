const { fork } = require('child_process');

// Porta como parâmetro de entrada
const PORTSENV = process.env.PORTS || "9000,9001,9002";
const ports=PORTSENV.split(",");

if (!ports) {
  console.log('Por favor, forneça uma porta como parâmetro de entrada.');
  process.exit(1);
}

// Caminho para o script do processo filho
const childScript = './index.js';

// Criar um processo 
const PROCESSOS=[];
for(let index in ports){

    const child = fork(childScript, [ports[index]]);
    
    child.on('message', (message) => {
        console.log('Mensagem do processo filho:', message);
    });

    child.on('exit', function () {
        console.log('Processo filho terminou, terminando o processo pai...');
        console.log(child);
        //process.exit();
    });
    PROCESSOS.push(child);
}
