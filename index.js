import axios from 'axios';
import cheerio from 'cheerio';
import fs from 'fs';
import jimp from 'jimp';
import express from 'express';
import path from 'path';
import cors from 'cors';
const baseUrl = 'https://cdn.star.nesdis.noaa.gov/GOES16/ABI/SECTOR/nsa/Sandwich/';


const imageIndexes = [7];

const directory = './images'; // Diretório com as imagens
const delay = 10000; // Tempo de atraso em milissegundos (10 segundos)
function downloadAndCropImages() {
axios.get(baseUrl)
    .then(response => {
        const $ = cheerio.load(response.data);

        const imageLinks = imageIndexes.map(index => {
        return $('a[href$=".jpg"]')
            .toArray()
            .reverse()[index];
        }).map(el => $(el).attr('href'));

        imageLinks.forEach((imageLink, index) => {
        const imageUrl = baseUrl + imageLink;
        const imagePath = `./images/image-${index}.jpg`; // Caminho para salvar a imagem localmente

        axios({
            url: imageUrl,
            method: 'GET',
            responseType: 'stream'
        }).then(response => {
            response.data.pipe(fs.createWriteStream(imagePath))
            .on('finish', () => {
                console.log(`Imagem ${index + 1} baixada com sucesso!`);

                // Verifica se todas as imagens foram baixadas
                if (index === imageLinks.length - 1) {
                // Todas as imagens foram baixadas, então realiza o recorte
                fs.readdir(directory, (err, files) => {
                    if (err) {
                    console.error(err);
                    return;
                    }

                    const images = files.filter(file => file.endsWith('.jpg'));

                    images.forEach((filename, index) => {
                    setTimeout(() => {
                        jimp.read(`./images/${filename}`)
                        .then(image => {
                            const x = 2500;     // coordenada x do canto superior esquerdo do recorte
                            const y = 1400;      // coordenada y do canto superior esquerdo do recorte
                            const width = 3160; // largura do recorte
                            const height = 2650; // altura do recorte
                            const newWidth = 6320; // largura da nova imagem
                            const newHeight = 5300; // altura da nova imagem
                            

                            // Recorta e redimensiona a imagem
                            image.crop(x, y, width, height).resize(newWidth, newHeight);

                            // Salva a nova imagem em um arquivo
                            image.write(`./recortes/recorte_da_imagem-${index + 1}.jpg`);
                            console.log(`Imagem ${index + 1} recortada com sucesso!`);
                        })
                        .catch(err => {
                            console.error(err);
                        });
                    }, delay * (index + 1)); // Define o atraso de acordo com o índice da imagem no array
                    });
                });
                }
            });
        }).catch(error => {
            console.error(`Erro ao baixar a imagem ${index + 1}: ${error}`);
        });
        });
    })
    .catch(error => {
        console.error(`Erro ao atualizar a URL base e baixar as imagens: ${error}`);
    });}

  setInterval(downloadAndCropImages, 30000);

const app = express()
const port = 3001
app.use(cors())

const __dirname = path.resolve();


function getImagePath() {
  return path.join(__dirname, './recortes/recorte_da_imagem-1.jpg');
}
app.get('/recorte', (req, res) => {

  res.sendFile(getImagePath());
});


app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});