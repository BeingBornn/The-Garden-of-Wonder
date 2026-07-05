import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Octree } from "three/addons/math/Octree.js";
import { Capsule } from "three/addons/math/Capsule.js";

//Audio with Howler.js
const sounds = {
  backgroundMusic: new Howl({
    src: ["./sfx/music.ogg"],
    loop: true,
    volume: 0.3,
    preload: true,
  }),

  projectsSFX: new Howl({
    src: ["./sfx/projects.ogg"],
    volume: 0.5,
    preload: true,
  }),

  pokemonSFX: new Howl({
    src: ["./sfx/pokemon.ogg"],
    volume: 0.5,
    preload: true,
  }),

  jumpSFX: new Howl({
    src: ["./sfx/jumpsfx.ogg"],
    volume: 1.0,
    preload: true,
  }),
};

let isMuted = false;

function playSound(soundId) {
  if (!isMuted && sounds[soundId]) {
    sounds[soundId].play();
  }
}

function stopSound(soundId) {
  if (sounds[soundId]) {
    sounds[soundId].stop();
  }
}

//three.js setup
const scene = new THREE.Scene();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const canvas = document.getElementById("experience-canvas");
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

// Some of DOM elements, others are scattered in the file
const themeToggleButton = document.querySelector(".theme-mode-toggle-button");
const firstIcon = document.querySelector(".first-icon");
const secondIcon = document.querySelector(".second-icon");

const audioToggleButton = document.querySelector(".audio-toggle-button");
const firstIconTwo = document.querySelector(".first-icon-two");
const secondIconTwo = document.querySelector(".second-icon-two");

const loadingScreen = document.getElementById("loadingScreen");
const loadingText = document.querySelector(".loading-text");
const enterButton = document.querySelector(".enter-button");
const instructions = document.querySelector(".instructions");

const modal = document.querySelector(".modal");
const modalbgOverlay = document.querySelector(".modal-bg-overlay");
const modalTitle = document.querySelector(".modal-title");
const modalProjectDescription = document.querySelector(
  ".modal-project-description",
);

const modalExitButton = document.querySelector(".modal-exit-button");
const modalVisistProjectButton = document.querySelector(
  ".modal-project-visit-button",
);

let isModalOpen = false;

const manager = new THREE.LoadingManager();

manager.onLoad = function () {
  const t1 = gsap.timeline();

  t1.to(loadingText, {
    opacity: 0,
    duration: 0,
  });

  t1.to(enterButton, {
    opacity: 1,
    duration: 0,
  });
};

// Physics stuff
const GRAVITY = 30;
const CAPSULE_RADIUS = 0.35;
const CAPSULE_HEIGHT = 1;
const JUMP_HEIGHT = 17;
const MOVE_SPEED = 7;

let character = {
  instance: null,
  isMoving: false,
  spawnPosition: new THREE.Vector3(),
};
let targetRotation = Math.PI / 2;

const colliderOctree = new Octree();
const playerCollider = new Capsule(
  new THREE.Vector3(0, CAPSULE_RADIUS, 0),
  new THREE.Vector3(0, CAPSULE_HEIGHT, 0),
  CAPSULE_RADIUS,
);

let playerVelocity = new THREE.Vector3();
let playerOnFloor = false;

// Renderer Stuff
const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.75;

const loader = new GLTFLoader(manager);

// Modal stuff
const modalContent = {
  Project_1: {
    title: "Project one",
    content: "this is my Project one. hello world",
    link: "https://example.com",
  },
  Project_2: {
    title: "Project two",
    content: "this is my Project two. hello world",
    link: "https://example.com",
  },
  Project_3: {
    title: "Project three",
    content: "this is my Project three. hello world",
    link: "https://example.com",
  },
  Chest: {
    title: "🧜🏻‍♂️About Me🐬",
    content: "Hellooo u found tha Chesstt, this is me Danial. I’m a CS student building projects to grow my programming portfolio. On the signs ahead, you can see some projects I’ve built, and hopefully there will be more in the future. I’m a curious person and love solving those juicy problems. In my free time, I enjoy gaming and hanging out. I’m currently exploring different areas of computer science",
  },
};

function showModal(id) {
  const content = modalContent[id];
  if (content) {
    modalTitle.textContent = content.title;
    modalProjectDescription.textContent = content.content;

    if (content.link) {
      modalVisistProjectButton.href = content.link;
      modalVisistProjectButton.classList.remove("hidden");
    } else {
      modalVisistProjectButton.classList.add("hidden");
    }

    modal.classList.remove("hidden");
    modalbgOverlay.classList.remove("hidden");
    isModalOpen = true;
  }
}

function hideModal() {
  isModalOpen = false;
  modal.classList.add("hidden");
  modalbgOverlay.classList.add("hidden");

  playSound("projectsSFX");
}

let intersectObject = "";
const intersectObjects = [];
const intersectObjectsNames = [
  "Project_1",
  "Project_2",
  "Project_3",
  "Parrot",
  "Chicken",
  "green_parrot",
  "Squirtle",
  "Person",
  "Snorlax",
  "Pikachu",
  "Text",
  "Bulbasaur",
  "Chest",
];

loader.load(
  "./Portfoilo.glb",
  function (glb) {
    glb.scene.traverse((child) => {
      if (intersectObjectsNames.includes(child.name)) {
        intersectObjects.push(child);
      }
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }

      if (child.name === "person") {
        character.spawnPosition.copy(child.position);
        character.instance = child;
        playerCollider.start
          .copy(child.position)
          .add(new THREE.Vector3(0, CAPSULE_RADIUS, 0));
        playerCollider.end
          .copy(child.position)
          .add(new THREE.Vector3(0, CAPSULE_HEIGHT, 0));
      }
      if (child.name === "Ground_Collider") {
        colliderOctree.fromGraphNode(child);
        child.visible = false;
      }
    });
    scene.add(glb.scene);
  },
  undefined,
  function (error) {
    console.error(error);
  },
);

const sun = new THREE.DirectionalLight(0xffffff);
sun.castShadow = true;
sun.position.set(200, 100, -100);
sun.shadow.mapSize.width = 4096;
sun.shadow.mapSize.height = 4096;
sun.shadow.camera.left = -220;
sun.shadow.camera.right = 220;
sun.shadow.camera.top = 200;
sun.shadow.camera.bottom = -100;
sun.shadow.normalBias = 1;
scene.add(sun);

// const shadowHelper = new THREE.CameraHelper(sun.shadow.camera);
// scene.add(shadowHelper);

// const helper = new THREE.DirectionalLightHelper(sun, 5);
// scene.add(helper);

const light = new THREE.AmbientLight(0xffffff, 1.5); // soft white light
scene.add(light);

const aspect = sizes.width / sizes.height;
const camera = new THREE.OrthographicCamera(
  -aspect * 50,
  aspect * 50,
  50,
  -50,
  1,
  1000,
);

camera.position.x = 58;
camera.position.y = 64;
camera.position.z = 121;

// camera.position.x = 58;
// camera.position.y = 64;
// camera.position.z = 121;

const cameraOffset = new THREE.Vector3(25.645, 53.132, 70.513);
camera.zoom = 1.5;
camera.updateProjectionMatrix();

// const controls = new OrbitControls(camera, canvas);
// controls.update();

function onResize() {
  sizes.height = window.innerHeight;
  sizes.width = window.innerWidth;
  const aspect = sizes.width / sizes.height;
  camera.left = -aspect * 50;
  camera.right = aspect * 50;
  camera.top = 50;
  camera.bottom = -50;

  camera.updateProjectionMatrix();

  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}

function jumpCharacter(meshID) {
  const mesh = scene.getObjectByName(meshID);
  if (!mesh) return;

  if (!mesh.userData.originalScale) {
    mesh.userData.originalScale = mesh.scale.clone();
  }

  const originalScale = mesh.userData.originalScale;
  const startY = mesh.position.y;

  const jumpHeight = 2;
  const jumpDuration = 0.5;

  const t1 = gsap.timeline();

  t1.to(mesh.scale, {
    x: originalScale.x * 1.2,
    y: originalScale.y * 0.8,
    z: originalScale.z * 1.2,
    duration: jumpDuration * 0.2,
    ease: "power2.out",
  });

  t1.to(mesh.scale, {
    x: originalScale.x * 1.8,
    y: originalScale.y * 1.3,
    z: originalScale.z * 0.8,
    duration: jumpDuration * 0.3,
    ease: "power2.out",
  });

  t1.to(
    mesh.position,
    {
      y: mesh.position.y + jumpHeight,
      duration: jumpDuration * 0.5,
      ease: "power2.out",
    },
    "<",
  );

  t1.to(mesh.scale, {
    x: originalScale.x,
    y: originalScale.y,
    z: originalScale.z,
    duration: jumpDuration * 0.3,
    ease: "power1.inOut",
  });

  t1.to(
    mesh.position,
    {
      y: mesh.position.y,
      duration: jumpDuration * 0.5,
      ease: "bounce.out",
    },
    ">",
  );

  t1.to(mesh.scale, {
    x: originalScale.x,
    y: originalScale.y,
    z: originalScale.z,
    duration: jumpDuration * 0.2,
    ease: "elastic.out(1, 0.3)",
  });
}

function onClick() {
  //console.log(intersectObject);
  if (intersectObject !== "") {
    if (
      [
        "Parrot",
        "Text",
        "Bulbasaur",
        "Chicken",
        "green_parrot",
        "Pikachu",
        "Snorlax",
        "Squirtle",
      ].includes(intersectObject)
    ) {
      playSound("pokemonSFX");
      jumpCharacter(intersectObject);
    } else {
      playSound("projectsSFX");
      showModal(intersectObject);
    }
  }
}

function onPointerMove(event) {
  // 1. Normalize mouse coordinates
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function respawnCharacter() {
  character.instance.position.copy(character.spawnPosition);

  playerCollider.start
    .copy(character.spawnPosition)
    .add(new THREE.Vector3(0, CAPSULE_RADIUS, 0));
  playerCollider.end
    .copy(character.spawnPosition)
    .add(new THREE.Vector3(0, CAPSULE_HEIGHT, 0));

  playerVelocity.set(0, 0, 0);
  character.isMoving = false;
}

function playerCollisions() {
  const result = colliderOctree.capsuleIntersect(playerCollider);
  playerOnFloor = false;

  if (result) {
    playerOnFloor = result.normal.y > 0;
    playerCollider.translate(result.normal.multiplyScalar(result.depth));

    if (playerOnFloor) {
      character.isMoving = false;
      playerVelocity.x = 0;
      playerVelocity.z = 0;
    }
  }
}

function updatePlayer() {
  if (!character.instance) return;

  if (character.instance.position.y < -20) {
    respawnCharacter();
    return;
  }

  if (!playerOnFloor) {
    playerVelocity.y -= GRAVITY * 0.035;
  }

  playerCollider.translate(playerVelocity.clone().multiplyScalar(0.035));

  playerCollisions();

  character.instance.position.copy(playerCollider.start);
  character.instance.position.y -= CAPSULE_RADIUS;

  let rotationDiff =
    ((((targetRotation - character.instance.rotation.y) % (2 * Math.PI)) +
      3 * Math.PI) %
      (2 * Math.PI)) -
    Math.PI;

  let finalRotation = character.instance.rotation.y + rotationDiff;

  character.instance.rotation.y = THREE.MathUtils.lerp(
    character.instance.rotation.y,
    finalRotation,
    0.04,
  );
}

function onKeyDown(event) {
  if (event.key.toLowerCase() === "r") {
    respawnCharacter();
    return;
  }

  if (character.isMoving) return;

  playSound("jumpSFX");

  switch (event.key.toLowerCase()) {
    case "w":
    case "arrowup":
      playerVelocity.z -= MOVE_SPEED;
      targetRotation = Math.PI / 2;
      break;
    case "s":
    case "arrowdown":
      playerVelocity.z += MOVE_SPEED;
      targetRotation = -Math.PI / 2;
      break;
    case "a":
    case "arrowleft":
      playerVelocity.x -= MOVE_SPEED;
      targetRotation = 0;
      break;
    case "d":
    case "arrowright":
      playerVelocity.x += MOVE_SPEED;
      targetRotation = Math.PI;
      break;
    default:
      return;
  }
  playerVelocity.y = JUMP_HEIGHT;
  character.isMoving = true;
}

// Toggle Theme Function
function toggleTheme() {
  playSound("projectsSFX");

  const isDarkTheme = document.body.classList.contains("dark-theme");

  document.body.classList.toggle("dark-theme");
  document.body.classList.toggle("light-theme");

  if (firstIcon.style.display === "none") {
    firstIcon.style.display = "block";
    secondIcon.style.display = "none";
  } else {
    firstIcon.style.display = "none";
    secondIcon.style.display = "block";
  }

  gsap.to(light.color, {
    r: isDarkTheme ? 1.0 : 0.25,
    g: isDarkTheme ? 1.0 : 0.31,
    b: isDarkTheme ? 1.0 : 0.78,
    duration: 1,
    ease: "power2.inOut",
  });

  gsap.to(light, {
    intensity: isDarkTheme ? 1.5 : 0.9,
    duration: 1,
    ease: "power2.inOut",
  });

  gsap.to(sun, {
    intensity: isDarkTheme ? 1 : 0.8,
    duration: 1,
    ease: "power2.inOut",
  });

  gsap.to(sun.color, {
    r: isDarkTheme ? 1.0 : 0.25,
    g: isDarkTheme ? 1.0 : 0.41,
    b: isDarkTheme ? 1.0 : 0.88,
    duration: 1,
    ease: "power2.inOut",
  });
}

enterButton.addEventListener("click", () => {
  gsap.to(loadingScreen, {
    opacity: 0,
    duration: 0,
  });

  gsap.to(instructions, {
    opacity: 0,
    duration: 0,
    onComplete: () => {
      loadingScreen.remove();
    },
  });

  playSound("projectsSFX");
  playSound("backgroundMusic");
});

// Toggle Audio Function
function toggleAudio() {
  if (!isMuted) {
    playSound("projectsSFX");
  }

  if (firstIconTwo.style.display === "none") {
    firstIconTwo.style.display = "block";
    secondIconTwo.style.display = "none";
    isMuted = false;
    sounds.backgroundMusic.play();
  } else {
    firstIconTwo.style.display = "none";
    secondIconTwo.style.display = "block";
    isMuted = true;
    sounds.backgroundMusic.pause();
  }
}

themeToggleButton.addEventListener("click", toggleTheme);
audioToggleButton.addEventListener("click", toggleAudio);
modalExitButton.addEventListener("click", hideModal);
modalbgOverlay.addEventListener("click", hideModal);
window.addEventListener("resize", onResize);
window.addEventListener("click", onClick);
window.addEventListener("pointermove", onPointerMove);
window.addEventListener("keydown", onKeyDown);

function animate() {
  updatePlayer();
  if (character.instance) {
    const targetCameraPosition = new THREE.Vector3(
      character.instance.position.x + cameraOffset.x,
      cameraOffset.y,
      character.instance.position.z + cameraOffset.z,
    );
    camera.position.copy(targetCameraPosition);
    camera.lookAt(
      character.instance.position.x,
      camera.position.y - 53.132,
      character.instance.position.z,
    );
    camera.translateY(20);
    camera.updateMatrixWorld();
  }

  raycaster.setFromCamera(pointer, camera);

  const intersects = raycaster.intersectObjects(intersectObjects);

  if (intersects.length > 0) {
    document.body.style.cursor = "pointer";
  } else {
    document.body.style.cursor = "default";
    intersectObject = "";
  }

  for (let i = 0; i < intersects.length; i++) {
    intersectObject = intersects[0].object.parent.name;
  }
  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);
