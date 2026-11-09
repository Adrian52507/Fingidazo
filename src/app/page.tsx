"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Edges, Html, Text } from "@react-three/drei";
import { Suspense, useRef, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { DoubleSide, type Group, type Mesh, type MeshBasicMaterial } from "three";

// 🎯 UNIFIED ANIMATION TIMING CONFIG - TODO DEPENDE DE ESTO
const ANIMATION_CONFIG = {
  // Fase 1: Desaceleración después del click
  slowdownDuration: 0.8,
  slowdownFactor: 0.65,
  
  // Fase 2: Explosión total
  explosionDuration: 3.0,
  facesFadeDuration: 1.5,
  edgesFadeDuration: 1.5,
  
  // Fase 3: Texto y sonido
  textAppearanceDelay: 0.8,
  textAnimationDuration: 0.25,
  textRedSweepDelay: 0.95,
  textRedSweepDuration: 0.5,
  textFadeOutDuration: 0.6,
  
  // Audio
  audioPlayDelay: 0.8,
  
  // Movimiento de caras durante explosión
  facesExplosionSpeed: (index: number) => 4 + index * 0.5,
};

type FaceData = {
  velocity: [number, number, number];
  spinX: number;
  spinY: number;
  spinZ: number;
};

type FaceProps = {
  index: number;
  position: [number, number, number];
  rotation: [number, number, number];
  registerEdge: (index: number, el: Mesh | null) => void;
};

// Definido fuera de <Cube>: si se declara dentro, React lo trata como un
// componente nuevo en cada render y remonta las caras a mitad de la explosión.
function Face({ position, rotation, index, registerEdge }: FaceProps) {
  return (
    <group position={position}>
      <mesh rotation={rotation}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#ffffff" side={DoubleSide} />
        <Edges
          ref={(el: Mesh | null) => registerEdge(index, el)}
          scale={1.01}
          threshold={15}
          color="black"
        />
      </mesh>
    </group>
  );
}

function setCursor(value: "pointer" | "auto") {
  document.body.style.cursor = value;
}

function Cube() {
  const router = useRouter();
  const groupRef = useRef<Group>(null!);
  const textRef = useRef<Mesh>(null);
  const edgeRefs = useRef<(Mesh | null)[]>(Array(6).fill(null));
  const registerEdge = useCallback((index: number, el: Mesh | null) => {
    edgeRefs.current[index] = el;
  }, []);

  const [hovered, setHovered] = useState(false);
  const [clicked, setClicked] = useState(false);
  const [exploding, setExploding] = useState(false);
  const [showText, setShowText] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(false);

  const speed = useRef({ x: 0.04, y: 0.04 });

  // Velocidad inicial aleatoria (fuera del render para mantenerlo puro).
  useEffect(() => {
    speed.current = { x: 0.02 + Math.random() * 0.04, y: 0.02 + Math.random() * 0.04 };
    // Al salir de la portada, el cursor no debe quedarse en "pointer" en el resto del sitio.
    return () => setCursor("auto");
  }, []);

  const baseSpeed = useRef({ x: 0.03, y: 0.035 });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioReady = useRef(false);
  const audioPlayed = useRef(false);
  
  // 🎯 TIMELINE MASTER - Controla TODO
  const timelineRef = useRef({
    explosionStartTime: 0,
    elapsedTime: 0, // Tiempo transcurrido desde que empezó la explosión
    progress: 0,    // 0 a 1, progreso normalizado
    textFadeOutStartTime: undefined as number | undefined,
  });

  // Almacenar datos de explosión para cada cara
  const faceDataRef = useRef<FaceData[]>([
    { velocity: [0, 0, 1], spinX: 0, spinY: 0, spinZ: 0 },
    { velocity: [0, 0, -1], spinX: 0, spinY: 0, spinZ: 0 },
    { velocity: [1, 0, 0], spinX: 0, spinY: 0, spinZ: 0 },
    { velocity: [-1, 0, 0], spinX: 0, spinY: 0, spinZ: 0 },
    { velocity: [0, 1, 0], spinX: 0, spinY: 0, spinZ: 0 },
    { velocity: [0, -1, 0], spinX: 0, spinY: 0, spinZ: 0 },
  ]);

  // 🎵 IMPROVED AUDIO PRELOADING
  useEffect(() => {
    if (typeof window !== "undefined") {
      const audio = new Audio("/sounds/reveal.mp3");
      audio.preload = "auto";
      audio.volume = 0.8;
      audio.load();

      audio.oncanplaythrough = () => {
        audioReady.current = true;
      };

      audio.onloadeddata = () => {
        if (!audioReady.current) {
          audioReady.current = true;
        }
      };

      audioRef.current = audio;

      return () => {
        audio.oncanplaythrough = null;
        audio.onloadeddata = null;
      };
    }
  }, []);

  const ensureAudioContext = useCallback(() => {
    if (typeof window !== "undefined" && audioRef.current && !audioReady.current) {
      audioRef.current.play().then(() => {
        audioRef.current?.pause();
        audioRef.current!.currentTime = 0;
        audioReady.current = true;
      }).catch(() => {});
    }
  }, []);

  // Cuando termina la animación, el texto se desvanece y se navega al juego.
  useEffect(() => {
    if (animationComplete) {
      const timer = setTimeout(() => {
        router.push('/game');
      }, ANIMATION_CONFIG.textFadeOutDuration * 1000);
      return () => clearTimeout(timer);
    }
  }, [animationComplete, router]);

  const handleClick = useCallback(() => {
    if (!clicked) {
      ensureAudioContext();
      setCursor("auto");
      setClicked(true);
    }
  }, [clicked, ensureAudioContext]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    // Fase 1: Rotación normal o desaceleración
    if (!clicked) {
      if (hovered) {
        speed.current.x += (0 - speed.current.x) * 0.08;
        speed.current.y += (0 - speed.current.y) * 0.08;
      } else {
        speed.current.x += (baseSpeed.current.x - speed.current.x) * 0.05;
        speed.current.y += (baseSpeed.current.y - speed.current.y) * 0.05;
      }
      groupRef.current.rotation.x += speed.current.x;
      groupRef.current.rotation.y += speed.current.y;
    }

    // Fase 2: Desaceleración después del click (antes de la explosión)
    if (clicked && !exploding) {
      speed.current.x *= ANIMATION_CONFIG.slowdownFactor;
      speed.current.y *= ANIMATION_CONFIG.slowdownFactor;
      groupRef.current.rotation.x += speed.current.x;
      groupRef.current.rotation.y += speed.current.y;

      if (Math.abs(speed.current.x) < 0.001 && Math.abs(speed.current.y) < 0.001) {
        groupRef.current.rotation.x = 0;
        groupRef.current.rotation.y = 0;
        setExploding(true);
        
        // Inicializar timeline de explosión
        timelineRef.current.explosionStartTime = 0;
        timelineRef.current.elapsedTime = 0;
        timelineRef.current.progress = 0;

        // Inicializar velocidades aleatorias de caras
        faceDataRef.current.forEach((face) => {
          face.spinX = (Math.random() - 0.5) * 20;
          face.spinY = (Math.random() - 0.5) * 20;
          face.spinZ = (Math.random() - 0.5) * 15;
          face.velocity = [
            face.velocity[0] + (Math.random() - 0.5) * 0.3,
            face.velocity[1] + (Math.random() - 0.5) * 0.3,
            face.velocity[2] + (Math.random() - 0.5) * 0.3
          ];
        });
      }
    }

    // 🎯 FASE 3: EXPLOSIÓN - TODO SINCRONIZADO POR TIMELINE
    if (exploding) {
      // Actualizar timeline general
      timelineRef.current.elapsedTime += delta;
      timelineRef.current.progress = Math.min(
        timelineRef.current.elapsedTime / ANIMATION_CONFIG.explosionDuration,
        1.0
      );

      // Mover y animar caras basado en TIMELINE
      groupRef.current.children.forEach((child, index) => {
        if (!child || index >= 6) return;
        
        const faceData = faceDataRef.current[index];

        // Movimiento: usa elapsedTime en vez de face.time
        const speed = ANIMATION_CONFIG.facesExplosionSpeed(index);
        child.position.x += faceData.velocity[0] * speed * delta;
        child.position.y += faceData.velocity[1] * speed * delta;
        child.position.z += faceData.velocity[2] * speed * delta;

        // Rotación caótica
        child.rotation.x += faceData.spinX * delta;
        child.rotation.y += faceData.spinY * delta;
        child.rotation.z += faceData.spinZ * delta;

        // Escala: depende del TIMELINE
        const faceFadeProgress = Math.min(
          timelineRef.current.elapsedTime / ANIMATION_CONFIG.facesFadeDuration,
          1.0
        );
        const scale = Math.max(0.05, 1 - faceFadeProgress * 2);
        child.scale.setScalar(scale);

        // Opacidad de CARAS: sincronizada con timeline
        child.children.forEach((obj) => {
          const material = (obj as Mesh).material as MeshBasicMaterial | undefined;
          if (material) {
            material.transparent = true;
            material.opacity = Math.max(0, 1 - faceFadeProgress * 1.5);
          }
        });

        // Opacidad de BORDES: sincronizada exactamente igual
        if (edgeRefs.current[index]) {
          const edgeMaterial = edgeRefs.current[index]?.material as MeshBasicMaterial | undefined;
          if (edgeMaterial) {
            edgeMaterial.transparent = true;
            edgeMaterial.opacity = Math.max(0, 1 - faceFadeProgress * 1.5);
          }
        }
      });

      // 🎵 AUDIO: Sincronizado con timeline
      const audioTriggerProgress = Math.min(
        timelineRef.current.elapsedTime / ANIMATION_CONFIG.audioPlayDelay,
        1.0
      );
      
      if (audioTriggerProgress >= 1.0 && !audioPlayed.current) {
        if (audioRef.current && audioReady.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch((e) => {
            console.warn("Audio play falló:", e);
          });
          audioPlayed.current = true;
        }
      }

      // 📝 TEXTO: Sincronizado con timeline
      const textTriggerProgress = Math.min(
        timelineRef.current.elapsedTime / ANIMATION_CONFIG.textAppearanceDelay,
        1.0
      );
      
      if (textTriggerProgress >= 1.0 && !showText) {
        setShowText(true);
      }

      // ✅ FIN: depende solo del tiempo, no de que el texto 3D haya cargado.
      // (La fuente del texto se descarga de un CDN; si falla, igual se entra al juego.)
      const animationEnd =
        ANIMATION_CONFIG.textAppearanceDelay +
        ANIMATION_CONFIG.textRedSweepDelay +
        ANIMATION_CONFIG.textRedSweepDuration;
      if (timelineRef.current.elapsedTime >= animationEnd && !animationComplete) {
        setAnimationComplete(true);
      }

      // 📝 ANIMACIÓN DE TEXTO: Depende del timeline
      if (showText && textRef.current) {
        const textElapsedTime = Math.max(
          0,
          timelineRef.current.elapsedTime - ANIMATION_CONFIG.textAppearanceDelay
        );
        const textProgress = Math.min(
          textElapsedTime / ANIMATION_CONFIG.textAnimationDuration,
          1.0
        );
        const eased = 1 - Math.pow(1 - textProgress, 3);
        
        let color = "white";
        let extraScale = 1;
        
        // 🟢 BARRIDO VERDE: también sincronizado
        const redSweepElapsedTime = Math.max(
          0,
          timelineRef.current.elapsedTime - (ANIMATION_CONFIG.textAppearanceDelay + ANIMATION_CONFIG.textRedSweepDelay)
        );
        const redSweepProgress = Math.min(
          redSweepElapsedTime / ANIMATION_CONFIG.textRedSweepDuration,
          1.0
        );

        if (redSweepProgress > 0) {
          const sweepPeak = Math.sin(redSweepProgress * Math.PI);
          color = `hsl(120, ${100 * sweepPeak}%, ${100 - 50 * sweepPeak}%)`;
          extraScale = 1 + sweepPeak * 0.3;
        }
        
        // Fade out del texto cuando se está desvaneciendo
        let textOpacity = 1;
        if (animationComplete && timelineRef.current.textFadeOutStartTime === undefined) {
          timelineRef.current.textFadeOutStartTime = timelineRef.current.elapsedTime;
        }
        if (animationComplete && timelineRef.current.textFadeOutStartTime !== undefined) {
          const fadeOutElapsed = timelineRef.current.elapsedTime - timelineRef.current.textFadeOutStartTime;
          const fadeOutProgress = Math.min(fadeOutElapsed / ANIMATION_CONFIG.textFadeOutDuration, 1.0);
          textOpacity = 1 - fadeOutProgress;
        }
        
        const mat = textRef.current.material as MeshBasicMaterial;
        mat.opacity = textOpacity;
        mat.color.set(color);
        
        const scale = (0.2 + 0.8 * eased) * extraScale;
        textRef.current.scale.set(scale, scale, scale);
        textRef.current.position.z = -4 + 2 * eased;
      }
    }
  });

  return (
    <>
      {!clicked && (
        <Html position={[0, 0.9, 0]} center>
          <p className="start-instruction">Tócame</p>
        </Html>
      )}
      <group
        ref={groupRef}
        scale={0.5}
        onPointerOver={() => {
          if (!clicked) {
            setHovered(true);
            setCursor("pointer");
          }
        }}
        onPointerOut={() => {
          if (!clicked) {
            setHovered(false);
            setCursor("auto");
          }
        }}
        onClick={handleClick}
      >
        <Face registerEdge={registerEdge} index={0} position={[0, 0, 0.5]} rotation={[0, 0, 0]} />
        <Face registerEdge={registerEdge} index={1} position={[0, 0, -0.5]} rotation={[0, Math.PI, 0]} />
        <Face registerEdge={registerEdge} index={2} position={[0.5, 0, 0]} rotation={[0, -Math.PI / 2, 0]} />
        <Face registerEdge={registerEdge} index={3} position={[-0.5, 0, 0]} rotation={[0, Math.PI / 2, 0]} />
        <Face registerEdge={registerEdge} index={4} position={[0, 0.5, 0]} rotation={[-Math.PI / 2, 0, 0]} />
        <Face registerEdge={registerEdge} index={5} position={[0, -0.5, 0]} rotation={[Math.PI / 2, 0, 0]} />
      </group>

      {showText && (
        <Suspense fallback={null}>
        <Text
          ref={textRef}
          position={[0, 0, -4]}
          fontSize={0.55}
          color="white"
          anchorX="center"
          anchorY="middle"
          scale={[0.2, 0.2, 0.2]}
        >
          😈
        </Text>
        </Suspense>
      )}
    </>
  );
}

export default function Home() {
  return (
    <main className="w-full h-screen h-dvh bg-black flex items-center justify-center">
      <Canvas camera={{ position: [0, 0, 4] }}>
        <Cube />
      </Canvas>
    </main>
  );
}
