import React, { useState, useEffect } from 'react';
import { 
  Collection,  
  withAuthenticator,
  useAuthenticator,
  Button
} from '@aws-amplify/ui-react';
import { Storage } from 'aws-amplify';
import "@aws-amplify/ui-react/styles.css"
import { S3ProviderListOutputItem } from "@aws-amplify/storage"
import { ImageCard } from './ImageCard';
import { HeroLayout1 } from './ui-components';
import './App.css';

class FibLFSR {
  XORGates = [2, 3, 5];
  password;
  numBit;
  constructor(password) {
      this.password = password;
      this.numBit = password.length;
  }

  /**
   * Calls step() k times with the output being a base10 representation of the k binary numbers
   *
   * Class is updated with seed as step() is called, base 10 value returned
   */
  generate(k) {
      var value = 0;
      var temp;

      for (var i = 0; i < k; i++) {
          this.step();
      }

      for (var i = 0; i < k; i++) {
          temp = this.password.charAt((this.numBit - 1) - i) - '0';
          if (temp === 1) {
              value += Math.pow(2, i);
          }
      }

      return value;
  }

  /**
   * Initiates a 'step' with the current password. Step will left shift all bits
   * except the rightmost which will be created based on predefined XOR gates
   */
  step() {
      var temp = "";
      var output = this.password.charAt(0);
  
      for (var i = 0; i < this.password.length - 1; i++) {
          temp = temp.concat(this.password.charAt(i + 1));
      }
  
      for (var i = 0; i < this.XORGates.length; i++) {
          output = (output == this.password.charAt(i)) ? "0" : "1";
      }
  
      temp = temp.concat(output);
      this.password = temp;
  
      return output - "0";
  }
}

function App() {
  const [imageKeys, setImageKeys] = useState([]);
  const [images, setImages] = useState([]);
  const {signOut} = useAuthenticator((context) => [context.signOut]);

  const fetchImages = async () => {
    const { results } = await Storage.list("", {level: 'private'});
    setImageKeys(results);

    
    decryptAndDisplayImages(results);
  }

  useEffect(() => {
    fetchImages();
  }, []);

  const onSuccess = (event) => {
    fetchImages();
  }

  async function encryptImage(e) {
    const imgFile = e.target.files[0];
  
    var img = new Image();
    var encryptedImage = new Image();
    const algo = new FibLFSR("01010101");
  
    img.onload = async function() {
      // Encrypt Photo
      var canvas = document.createElement('canvas');
      
      canvas.width = img.width;
      canvas.height = img.height;
  
      var ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
  
      for (var i = 0; i < data.length; i += 4) {
          let red = data[i];
          let green = data[i + 1];
          let blue = data[i  + 2];
  
          red = red ^ algo.generate(8);
          green = green ^ algo.generate(8);
          blue = blue ^ algo.generate(8);

          data[i] = red;
          data[i+1] = green;
          data[i+2] = blue;
      }
      ctx.putImageData(imageData, 0, 0);
      encryptedImage.src = canvas.toDataURL();
  
      const res = await fetch(encryptedImage.src);
      const blob = await res.blob();
      const encryptFile = new File([blob], imgFile.name, blob);

      // Upload encrypted photo to S3  
      try {
        await Storage.put(encryptFile.name, encryptFile, {
          level: 'private',
          contentType: "image/png", // contentType is optional
        });
        
      } catch (error) {
        console.log("Error uploading file: ", error);
      }
      onSuccess();
    }
  
    const reader = new FileReader();
    
    reader.onload = function() {
      img.src = reader.result;
    }
    reader.readAsDataURL(imgFile)
  }

  async function decryptAndDisplayImages(results) {
    var decryptedImagesURL = [];
    results.map(
      async image => {
        var encryptedImage = new Image();
        encryptedImage.onload = async function() {
          const algo = new FibLFSR("01010101");
          var canvas = document.createElement('canvas');
          
          canvas.width = encryptedImage.width;
          canvas.height = encryptedImage.height;
      
          var ctx = canvas.getContext("2d");
          ctx.drawImage(encryptedImage, 0, 0, canvas.width, canvas.height);
      
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
      
          for (var i = 0; i < data.length; i += 4) {
              let red = data[i];
              let green = data[i + 1];
              let blue = data[i  + 2];
      
              red = red ^ algo.generate(8);
              green = green ^ algo.generate(8);
              blue = blue ^ algo.generate(8);
      
              data[i] = red;
              data[i+1] = green;
              data[i+2] = blue;
          }
          ctx.putImageData(imageData, 0, 0);
          decryptedImagesURL.push(canvas.toDataURL())
          setImages(decryptedImagesURL);
        }
        const imageURL = await Storage.get(image.key, {level: 'private'});
        encryptedImage.src = imageURL;
        encryptedImage.crossOrigin = "Anonymous";
      }
    )
  }

  return (
    <>
      <HeroLayout1 width="100%"/>
      <div>
        <h4>Upload Image</h4>

        <input
          type='file'
          accept='image/*'
          onChange={encryptImage}
        />

        <Collection
          items={images}
          type="grid"
          padding="2rem"
          boxShadow="0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)"
          maxWidth="1100px"
          margin='0 auto'
          justifyContent="center"
          templateColumns={{
            base: "minmax(0, 500px",
            medium: "repeat(2, minmax(0, 1fr))",
            large: "repeat(3, minmax(0, 1fr))"
          }}
          gap="small"
        >
          {(item, index) => (
            <ImageCard
              key={index}
              imageKeys={imageKeys}
              item={item}
              index={index}
            />
          )}
        </Collection>
        <Button 
        onClick={signOut} 
        width="100%"
        marginTop="15px">Sign Out</Button>
      </div>
      
    </>
  );
}

export default withAuthenticator(App);