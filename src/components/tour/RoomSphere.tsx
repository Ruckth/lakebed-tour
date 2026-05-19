import type { Ref } from "react";
import { BackSide, type MeshBasicMaterial, type Texture } from "three";

export function RoomSphere({
  texture,
  opacity = 1,
  materialRef,
}: {
  texture: Texture;
  opacity?: number;
  materialRef?: Ref<MeshBasicMaterial>;
}) {
  return (
    <mesh rotation={[0, Math.PI, 0]}>
      <sphereGeometry args={[500, 60, 40]} />
      <meshBasicMaterial
        ref={materialRef}
        map={texture}
        side={BackSide}
        transparent={opacity < 1}
        opacity={opacity}
        depthWrite={false}
      />
    </mesh>
  );
}
