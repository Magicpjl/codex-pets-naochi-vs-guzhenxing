"use strict";

(() => {
  const CELL_WIDTH = 192;
  const CELL_HEIGHT = 208;
  // Timings match the delivered GIF clips, including each last-frame hold.
  const ACTIONS = [
    { id: "idle", name: "待机", durations: [280, 110, 110, 140, 140, 320] },
    { id: "running-right", name: "向右移动", durations: [120, 120, 120, 120, 120, 120, 120, 220] },
    { id: "running-left", name: "向左移动", durations: [120, 120, 120, 120, 120, 120, 120, 220] },
    { id: "waving", name: "挥手", durations: [140, 140, 140, 280] },
    { id: "jumping", name: "跳跃", durations: [140, 140, 140, 140, 280] },
    { id: "failed", name: "失败", durations: [140, 140, 140, 140, 140, 140, 140, 240] },
    { id: "waiting", name: "等待", durations: [150, 150, 150, 150, 150, 260] },
    { id: "running", name: "唱歌", durations: [120, 120, 120, 120, 120, 220] },
    { id: "review", name: "检查", durations: [150, 150, 150, 150, 150, 280] },
  ];
  const DIRECTIONS = ["上", "右上", "右上", "右上", "右", "右下", "右下", "右下", "下", "左下", "左下", "左下", "左", "左上", "左上", "左上"];
  const sync = document.getElementById("sync");
  const playAll = document.getElementById("play-all");
  const restart = document.getElementById("restart");
  const status = document.getElementById("load-status");
  const performers = [...document.querySelectorAll(".performer")].map((card) => {
    const motion = card.querySelector(".motion");
    const direction = card.querySelector(".direction");
    ACTIONS.forEach((action) => motion.add(new Option(action.name, action.id)));
    motion.add(new Option("方向查看", "look"));
    DIRECTIONS.forEach((label, index) => direction.add(new Option(`${index * 22.5}° · ${label}`, String(index))));
    motion.value = "running";
    const image = new Image();
    return {
      card, motion, direction, image,
      context: card.querySelector("canvas").getContext("2d"),
      label: card.querySelector(".frame-label"),
      playButton: card.querySelector(".play-pet"),
      row: 7, mode: "action", frame: 0, angle: 0, elapsed: 0, playing: true,
    };
  });

  function targets(origin) {
    return sync.checked ? performers : [origin];
  }

  function updateControls(pet) {
    pet.motion.value = pet.mode === "look" ? "look" : ACTIONS[pet.row].id;
    pet.direction.value = String(pet.angle);
    pet.direction.disabled = pet.mode !== "look";
    pet.playButton.textContent = pet.playing ? "暂停" : "播放";
    pet.playButton.setAttribute("aria-pressed", String(pet.playing));
  }

  function updateGlobalButton() {
    playAll.textContent = performers.some((pet) => pet.playing) ? "暂停两人" : "播放两人";
  }

  function draw(pet) {
    const row = pet.mode === "look" ? 9 + Math.floor(pet.angle / 8) : pet.row;
    const column = pet.mode === "look" ? pet.angle % 8 : pet.frame;
    pet.context.clearRect(0, 0, CELL_WIDTH, CELL_HEIGHT);
    // Crop the existing cell as a whole: body and fixed HUD stay together.
    pet.context.drawImage(pet.image, column * CELL_WIDTH, row * CELL_HEIGHT, CELL_WIDTH, CELL_HEIGHT, 0, 0, CELL_WIDTH, CELL_HEIGHT);
    if (pet.mode === "look") {
      pet.label.textContent = `${pet.angle * 22.5}° · ${DIRECTIONS[pet.angle]} · 第 ${pet.angle + 1} / 16 个方向`;
      pet.direction.value = String(pet.angle);
    } else {
      pet.label.textContent = `${ACTIONS[pet.row].name} · 第 ${pet.frame + 1} / ${ACTIONS[pet.row].durations.length} 帧`;
    }
  }

  performers.forEach((pet) => {
    pet.motion.addEventListener("change", () => {
      const value = pet.motion.value;
      targets(pet).forEach((target) => {
        target.mode = value === "look" ? "look" : "action";
        if (value !== "look") target.row = ACTIONS.findIndex((action) => action.id === value);
        target.frame = 0;
        target.angle = 0;
        target.elapsed = 0;
        updateControls(target);
        draw(target);
      });
    });
    pet.direction.addEventListener("change", () => {
      const angle = Number(pet.direction.value);
      targets(pet).forEach((target) => {
        target.mode = "look";
        target.angle = angle;
        target.elapsed = 0;
        updateControls(target);
        draw(target);
      });
    });
    pet.playButton.addEventListener("click", () => {
      const playing = !pet.playing;
      targets(pet).forEach((target) => { target.playing = playing; updateControls(target); });
      updateGlobalButton();
    });
  });

  playAll.addEventListener("click", () => {
    const playing = !performers.some((pet) => pet.playing);
    performers.forEach((pet) => { pet.playing = playing; updateControls(pet); });
    updateGlobalButton();
  });
  restart.addEventListener("click", () => {
    performers.forEach((pet) => { pet.frame = 0; pet.angle = 0; pet.elapsed = 0; pet.playing = true; updateControls(pet); draw(pet); });
    updateGlobalButton();
  });
  sync.addEventListener("change", () => {
    if (!sync.checked) return;
    const first = performers[0];
    performers.slice(1).forEach((pet) => {
      ["row", "mode", "frame", "angle", "elapsed", "playing"].forEach((key) => { pet[key] = first[key]; });
      updateControls(pet);
      if (pet.image.complete && pet.image.naturalWidth) draw(pet);
    });
    updateGlobalButton();
  });

  let previousTime;
  function animate(time) {
    const delta = previousTime === undefined ? 0 : Math.min(time - previousTime, 100);
    previousTime = time;
    if (!document.hidden) {
      performers.forEach((pet) => {
        if (!pet.playing) return;
        pet.elapsed += delta;
        let duration = pet.mode === "look" ? 180 : ACTIONS[pet.row].durations[pet.frame];
        let advanced = false;
        while (pet.elapsed >= duration) {
          pet.elapsed -= duration;
          if (pet.mode === "look") pet.angle = (pet.angle + 1) % 16;
          else pet.frame = (pet.frame + 1) % ACTIONS[pet.row].durations.length;
          duration = pet.mode === "look" ? 180 : ACTIONS[pet.row].durations[pet.frame];
          advanced = true;
        }
        if (advanced) draw(pet);
      });
    }
    requestAnimationFrame(animate);
  }

  Promise.all(performers.map((pet) => new Promise((resolve, reject) => {
    pet.image.onload = () => {
      if (pet.image.naturalWidth !== 1536 || pet.image.naturalHeight !== 2288) {
        reject(new Error("精灵图尺寸不符合 v2 布局。"));
      } else resolve();
    };
    pet.image.onerror = () => reject(new Error("精灵图未能载入，请确认 assets 文件夹与预览页面放在一起。"));
    pet.image.src = `assets/pets/${pet.card.dataset.pet}/spritesheet.png`;
  }))).then(() => {
    performers.forEach((pet) => {
      pet.motion.disabled = false;
      pet.playButton.disabled = false;
      updateControls(pet);
      draw(pet);
    });
    playAll.disabled = false;
    restart.disabled = false;
    status.textContent = "";
    requestAnimationFrame(animate);
  }).catch((error) => {
    status.textContent = error.message;
    status.classList.add("error");
  });
})();
