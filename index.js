import {
  AmbientLight,
  AxesHelper,
  DirectionalLight,
  GridHelper,
  PerspectiveCamera,
  OrthographicCamera,
  Scene,
  WebGLRenderer,
  Vector3,
  Clock,MathUtils,
  MeshLambertMaterial ,Raycaster, Vector2
} from "three";
//for control
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

//for raycast and fast load
import { acceleratedRaycast, computeBoundsTree, disposeBoundsTree } from "three-mesh-bvh";


import {IFCPROJECT ,IFCSITE,  IFCBUILDING , IFCBUILDINGSTOREY,  IFCBUILDINGELEMENTPROXY} from "web-ifc"
import { IFCLoader } from "web-ifc-three/IFCLoader";

var showHighlight=true;
const hidden=[];
// Sets up optimized picking
//Creates the Three.js scene
const scene = new Scene();
const ifcModels = [];

const canvasContainer = document.getElementById("canvas-ref");
const containerRect = canvasContainer.getBoundingClientRect();
const containerWidth = containerRect.width;
const containerHeight = containerRect.height;
const size = {
  //width: window.innerWidth,
  //height: window.innerHeight,
  width: containerWidth,
  height: containerHeight,
};
//Object to store the size of the viewport
const aspect = size.width / size.height;
var FOV=60;
const camera = new PerspectiveCamera(FOV, aspect);

document.getElementById("saveLink").addEventListener("click", showHide);




var ifcmodel;

//Creates the camera (point of view of the user)

//const camera = new OrthographicCamera();
camera.position.z = 15;
camera.position.y = 13;
camera.position.x = 8;

const fovSlider = document.getElementById("fov-slider");
const fovDisplay = document.querySelector(".fov-display");


const newPosition = new Vector3();
// Calculate the new position vector
const direction = new Vector3();


// Function to update camera FOV based on slider value
function updateFOV() {

        const newFOV = parseFloat(fovSlider.value);
        camera.fov = newFOV;
        //  camera.updateProjectionMatrix();

        fovDisplay.textContent = `FOV: ${newFOV.toFixed(2)}°`;


        if(ifcmodel){
        
        
        // Initial position calculation
        const initialDistance = camera.position.distanceTo(ifcmodel.position);
        
        // Calculate the new position to counteract the zoom
        const newDistance = initialDistance * (FOV / newFOV);
        
        
        camera.getWorldDirection(direction); // Get camera's viewing direction
        direction.multiplyScalar(newDistance);
        newPosition.copy(ifcmodel.position).add(direction);
        
        // Update the camera's position
        //camera.position.copy(newPosition);  
        
        camera.position.z = -newPosition.z;
        camera.position.x = -newPosition.x;
        camera.position.y = -newPosition.y;
        
        

        
        }
        camera.updateProjectionMatrix();
        FOV=newFOV;

}

// Event listener to update FOV when the slider value changes
fovSlider.addEventListener("input", updateFOV);

//Creates the lights of the scene
const lightColor = 0xffffff;

const ambientLight = new AmbientLight(lightColor, 0.5);
scene.add(ambientLight);

const directionalLight = new DirectionalLight(lightColor, 1);
directionalLight.position.set(0, 15, 0);
directionalLight.target.position.set(0, -5, 0);
scene.add(directionalLight);
scene.add(directionalLight.target);

//Sets up the renderer, fetching the canvas of the HTML
const threeCanvas = document.getElementById("three-canvas");
const renderer = new WebGLRenderer({
  canvas: threeCanvas,
  alpha: true,
  preserveDrawingBuffer: true,
});

renderer.setSize(size.width, size.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

//Creates the orbit controls (to navigate the scene)
const controls = new OrbitControls(camera, threeCanvas);
controls.zoomToCursor = true;
controls.enableDamping = true;
const animate = () => {
  resizeCanvatodisplay();
  requestAnimationFrame(animate);
  controls.update();


  renderer.render(scene, camera);
};
updateFOV();
animate();

function resizeCanvatodisplay() {
  const containerRect = canvasContainer.getBoundingClientRect();
  const containerWidth = containerRect.width;
  const containerHeight = containerRect.height;
  const needResize =
    threeCanvas.width !== containerWidth &&
    threeCanvas.height !== containerHeight;
  if (needResize) {
    const size = {
      width: containerWidth,
      height: containerHeight,
    };
    camera.aspect = size.width / size.height;
    camera.updateProjectionMatrix();
    renderer.setSize(size.width, size.height);
  }
}

//Adjust the viewport to the size of the browser
window.addEventListener("resize", () => {
  size.width = window.innerWidth;
  size.height = window.innerHeight;
  camera.aspect = size.width / size.height;
  camera.updateProjectionMatrix();
  renderer.setSize(size.width, size.height);
});

const imginput = document.getElementById("file-input-img");
imginput.addEventListener(
  "change",
  (changed) => {
    const imgfile = changed.target.files[0];
    var imgurl = URL.createObjectURL(imgfile);
    canvasContainer.setAttribute("src", imgurl);
    const wi = canvasContainer.style.width;
    const hi = canvasContainer.style.height;
    renderer.setSize(wi, hi, false);
    camera.aspect = wi / hi;
    camera.updateProjectionMatrix();
  },
  false
);


// Sets up the IFC loading
const ifcLoader = new IFCLoader();
ifcLoader.ifcManager.setupThreeMeshBVH(computeBoundsTree, disposeBoundsTree, acceleratedRaycast);

const input = document.getElementById("file-input");
input.addEventListener(
  "change",
  (changed) => {
    const file = changed.target.files[0];
    var ifcURL = URL.createObjectURL(file);
    ifcLoader.load(ifcURL, async (ifcModel) => {
      

      //scene.add(ifcModel);
        ifcmodel = ifcModel;


        if(ifcmodel){
          
        ifcModels.push(ifcmodel);
        window.onmousemove = (event) => highlight(event, preselectMat, preselectModel);
          
        const ifcmod=ifcLoader.ifcManager.getSpatialStructure(0);
        ifcmod.then((result)=>{
                  // Create and render the tree view

         const treeView = createTreeView(result);
         const treeViewHtml=renderTreeView(treeView);  
         document.getElementById('ifc-tree').innerHTML = treeViewHtml;
         const buttonTree=document.getElementById("showTree");
         const fovSlid=document.getElementById("angle-slider-container");

         buttonTree.style.visibility='visible';
         fovSlid.style.visibility='visible';

        });

      }

    });
  },
  false
);

ifcLoader.ifcManager.setWasmPath("./");
ifcLoader.ifcManager.applyWebIfcConfig({
  COORDINATE_TO_ORIGIN: true,
  USE_FAST_BOOLS: true,
});




function getImage() {
  try {
    var imgData;
    var strMime = "image/png";
    imgData = renderer.domElement.toDataURL(strMime);

    //saveFile(imgData.replace(strMime, strDownloadMime), "test.png");
    var img2 = document.getElementById("img2");
    var img2ax = document.getElementById("img2_aux");
    img2.setAttribute("src", imgData);
    img2ax.setAttribute("src", imgData);

    var img1 = document.getElementById("img1");
    var img1ax = document.getElementById("img1_aux");
    var im = document.getElementById("cont");
    img1.src = canvasContainer.src;
    img1ax.src = canvasContainer.src;
    var imgov1 = document.getElementById("imageov1");
    var imgov2 = document.getElementById("imageov2");
    imgov1.src = canvasContainer.src;
    img1.onload = img2.onload = function () {
      img1ax.style.width = im.offsetWidth + "px";
      img1.style.width = im.offsetWidth + "px";
      img2ax.style.width = im.offsetWidth + "px";
      img2.style.width = im.offsetWidth + "px";

      imgov1.style.width = im.offsetWidth + "px";
      imgov2.setAttribute("src", imgData);
      imgov2.style.width = im.offsetWidth + "px";
    };
  } catch (e) {
    console.log(e);
    return;
  }
}

// var saveFile = function (strData, filename) {
//   var link = document.createElement("a");
//   if (typeof link.download === "string") {
//     document.body.appendChild(link); //Firefox requires the link to be in the body
//     link.download = filename;
//     link.href = strData;
//     link.click();
//     document.body.removeChild(link); //remove the link when done
//   } else {
//     location.replace(uri);
//   }
// };

function showHide() {
  // get the div elements by their ids
  var div1 = document.getElementById("container");

  var div2 = document.getElementById("cont");
  // check the current display attribute of the divs
  if (div1.style.display == "none") {
    // if div1 is hidden, show it and hide div2
    div1.style.display = "block";
    div2.style.display = "none";
    document.getElementById("saveLink").innerHTML = "Lock Frame";
  } else {
    // if div1 is visible, hide it and show div2

    getImage();

    div1.style.display = "none";
    div2.style.display = "flex";
    document.getElementById("saveLink").innerHTML = "Release Lock";
  }
}

const toggleButton = document.getElementById("toggleButton");
const imageContainer = document.getElementById("cont1b");
const image1 = document.getElementById("imageov2");
const sliders = document.getElementById("sliders");
const cont1a = document.getElementById("cont1a");
const sav = document.getElementById("savediv");
toggleButton.addEventListener("click", () => {
  if (
    (imageContainer.style.display === "none" &&
      cont1a.style.display === "flex") ||
    imageContainer.style.display === ""
  ) {
    imageContainer.style.display = "block";
    toggleButton.innerHTML = "Turn Overlay Off";
    cont1a.style.display = "none";
    sav.style.display = "none";
  } else {
    imageContainer.style.display = "none";
    cont1a.style.display = "flex";
    sav.style.display = "block";
    toggleButton.innerHTML = "Turn Overlay On";
  }
});

sliders.addEventListener("input", () => {
  const opacity = sliders.value / 100;
  image1.style.opacity = opacity;
});



//for selection of individual items

const raycaster = new Raycaster();
raycaster.firstHitOnly = true;
const mouse = new Vector2();
const preselectMat = new MeshLambertMaterial({
  transparent: true,
  opacity: 0.6,
  color: 0xff88ff,
  depthTest: false,
});

function cast(event) {
  // Computes the position of the mouse on the screen
  const bounds = threeCanvas.getBoundingClientRect();

  const x1 = event.clientX - bounds.left;
  const x2 = bounds.right - bounds.left;
  mouse.x = (x1 / x2) * 2 - 1;

  const y1 = event.clientY - bounds.top;
  const y2 = bounds.bottom - bounds.top;
  mouse.y = -(y1 / y2) * 2 + 1;

  // Places it on the camera pointing to the mouse
  raycaster.setFromCamera(mouse, camera);

  // Casts a ray
  return raycaster.intersectObjects(ifcModels);
}

const ifc = ifcLoader.ifcManager;

// Reference to the previous selection
let preselectModel = { id: -1 };



function highlight(event, material, model) {
  const found = cast(event)[0];
  if (found && showHighlight) {
    // Gets model ID
    model.id = found.object.modelID;

    // Gets Express ID
    const index = found.faceIndex;
    const geometry = found.object.geometry;
    const id = ifc.getExpressId(geometry, index);

    // Creates subset
    ifcLoader.ifcManager.createSubset({
      modelID: model.id,
      ids: [id],
      material: material,
      scene: scene,
      removePrevious: true,
    });
  } else {
    // Removes previous highlight
    ifc.removeSubset(model.id, material);
  }
}


threeCanvas.ondblclick = pick;


async function pick(event) {
  const found = cast(event)[0];
  if (found) {
    const index = found.faceIndex;
    const geometry = found.object.geometry;
    const ifc = ifcLoader.ifcManager;
    const id = ifc.getExpressId(geometry, index);
    const modelID = found.object.modelID;
    const props = await ifc.getItemProperties(ifcmodel.modelID, ifcmodel.id);
    //document.getElementById("ifc-tree").innerHTML=props['Name']['value'];
    var component;   
      
        //component.dispatchEvent(event);
        for(subset in subsets){
          const modl=subsets[subset];
          component=document.getElementById(subset.toString());
          if(subset!=id){

          showHighlight=false;
          component.checked=false;
          modl.removeFromParent(); 
        }
           
        } 
      
    
  }
}

// function printObjectRecursively(obj, indent = '') {
//   for (const key in obj) {
//       if (typeof obj[key] === 'object' && obj[key] !== null) {
//           console.log(`${indent}${key}:`);
//           printObjectRecursively(obj[key], indent + '  ');
//       } else {
//           console.log(`${indent}${key}: ${obj[key]}`);
//       }
//   }
// }

// Stores the created subsets
const subsets = {};
// Function to create a tree node
function createNode(expressID, type, checked = true) {
  return { expressID, type, checked, children: [] };
}


// Function to create the tree view
function createTreeView(ifcObject) {


  const treeNode = createNode(ifcObject.expressID, ifcObject.type);

  for (const child of ifcObject.children) {
      const childNode = createTreeView(child); // Recursive call
      treeNode.children.push(childNode);
      
      
}
const subdef = newSubsetOfType(ifcObject.expressID);
  subdef.then((result)=>{subsets[ifcObject.expressID]=result});
  
  return treeNode;
}

var tmp_name;

// Recursive function to render the tree view with checkboxes
function renderTreeView(node, level = 0) {
  let output = ' '.repeat(level * 2) + `<input type="checkbox" id="${node.expressID}" ${node.checked ? 'checked' : ''} 
  onchange="window.toggleVisibility(${node.expressID})"> ${node.type}\n`;
  for (const child of node.children) {
      output += renderTreeView(child, level + 1); // Recursive call
  }

  return output;
}




// Creates a new subset containing all elements of a category
async function newSubsetOfType(category) {
  
  const ids = [category];
  return ifcLoader.ifcManager.createSubset({
    modelID: 0,
    scene:scene,
    ids:ids,
    removePrevious: true,
    customID: category.toString(),
  });
}



// Function to toggle visibility of a component
window.toggleVisibility = function(expressID) {
  const checkbox = document.getElementById(expressID);
  const checked = checkbox.checked;
  const subset = subsets[expressID];
  if (checked) 
  {
    scene.add(subset);          
    showHighlights=true;
  }
  else {
    subset.removeFromParent();
    showHighlight=false;
  }
}


const showAll = document.getElementById("showTree");
var elements;
showAll.addEventListener("click",()=>{
  
  for(subset in subsets){
    elements=document.getElementById(subset.toString());
    scene.add(subsets[subset]);
    elements.checked=true;
  }
  showHighlight=true;
});