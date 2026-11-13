import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { resolve } from "node:path";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import sharp from "sharp";
import {
  buildCameraString,
  formatExifWarnings,
  formatShutterSpeed,
  readExif,
} from "../src/exif.js";
import type { ExifWarning } from "../src/exif.js";

const EXIF_FIXTURES_DIR = resolve(import.meta.dirname, "fixtures", "exif");

describe("buildCameraString", () => {
  it("strips corporate suffixes when Model already starts with the brand", () => {
    expect(buildCameraString("NIKON CORPORATION", "NIKON D850")).toBe(
      "NIKON D850",
    );
    expect(buildCameraString("LEICA CAMERA AG", "LEICA Q2")).toBe("LEICA Q2");
    expect(
      buildCameraString("RICOH IMAGING COMPANY, LTD.", "RICOH GR III"),
    ).toBe("RICOH GR III");
    expect(buildCameraString("RICOH IMAGING COMPANY, LTD.", "PENTAX KP")).toBe(
      "PENTAX KP",
    );
  });

  it("strips corporate suffixes when prepending Make to Model", () => {
    expect(buildCameraString("OLYMPUS CORPORATION", "E-M1MarkII")).toBe(
      "OLYMPUS E-M1MarkII",
    );
    expect(buildCameraString("Canon Inc.", "AE-1")).toBe("Canon AE-1");
  });
});

describe("formatExifWarnings", () => {
  it("returns empty string for no warnings", () => {
    expect(formatExifWarnings([])).toBe("");
  });

  it("formats a single warning", () => {
    const warnings: ExifWarning[] = [
      {
        filePath: "/photos/mono/rain.jpg",
        issues: ["no date", "no lens info"],
      },
    ];
    const result = formatExifWarnings(warnings);
    expect(result).toContain("1 photo");
    expect(result).toContain("/photos/mono/rain.jpg");
    expect(result).toContain("no date, no lens info");
    expect(result).toContain("sidecar YAML");
  });

  it("formats multiple warnings with correct plural", () => {
    const warnings: ExifWarning[] = [
      { filePath: "/photos/a.jpg", issues: ["no date"] },
      { filePath: "/photos/b.jpg", issues: ["corrupt EXIF"] },
    ];
    const result = formatExifWarnings(warnings);
    expect(result).toContain("2 photos");
  });
});

describe("formatShutterSpeed", () => {
  it("formats fractional seconds as 1/N", () => {
    expect(formatShutterSpeed(1 / 250)).toBe("1/250");
    expect(formatShutterSpeed(1 / 125)).toBe("1/125");
    expect(formatShutterSpeed(1 / 60)).toBe("1/60");
    expect(formatShutterSpeed(1 / 1000)).toBe("1/1000");
  });

  it("formats whole seconds with s suffix", () => {
    expect(formatShutterSpeed(1)).toBe("1s");
    expect(formatShutterSpeed(2)).toBe("2s");
    expect(formatShutterSpeed(30)).toBe("30s");
  });

  it("rounds fractional denominators", () => {
    // 1/3 ≈ 0.333... should round to 1/3
    expect(formatShutterSpeed(0.333333)).toBe("1/3");
  });

  it("handles 1/2 second", () => {
    expect(formatShutterSpeed(0.5)).toBe("1/2");
  });
});

describe("readExif", () => {
  let dir: string;
  let withExifPath: string;
  let noExifPath: string;

  beforeAll(async () => {
    dir = await mkdtemp(resolve(tmpdir(), "obscura-exif-"));
    withExifPath = resolve(dir, "with-exif.jpg");
    noExifPath = resolve(dir, "no-exif.jpg");

    const base = () =>
      sharp({
        create: { width: 8, height: 8, channels: 3, background: "#888888" },
      });

    await writeFile(
      withExifPath,
      await base()
        .withExif({
          IFD0: { Make: "NIKON", Model: "NIKON D850", Artist: "Jens" },
          IFD2: {
            DateTimeOriginal: "2024:06:01 12:34:56",
            LensModel: "35mm f/1.8",
            ISOSpeedRatings: "400",
            FNumber: "2.8",
            FocalLength: "35",
            ExposureTime: "0.004",
          },
        })
        .jpeg()
        .toBuffer(),
    );
    await writeFile(noExifPath, await base().jpeg().toBuffer());
  }, 30_000);

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  // Regression: exifr's path-based reader is broken on current Node, which made
  // readExif report every photo as "corrupt EXIF" and silently drop all data.
  it("reads EXIF fields from a real file on disk", async () => {
    const result = await readExif(withExifPath);
    expect(result.warning).toBeUndefined();
    expect(result.data.camera).toBe("NIKON D850");
    expect(result.data.lens).toBe("35mm f/1.8");
    expect(result.data.iso).toBe(400);
    expect(result.data.aperture).toBe(2.8);
    expect(result.data.focal_length).toBe(35);
    expect(result.data.shutter_speed).toBe("1/250");
    expect(result.data.photographer).toBe("Jens");
    expect(result.data.date?.getUTCFullYear()).toBe(2024);
  });

  it("warns without throwing when a file has no EXIF", async () => {
    const result = await readExif(noExifPath);
    expect(result.data).toEqual({});
    expect(result.warning?.issues).toContain("no EXIF data");
  });

  it("warns without throwing when the file does not exist", async () => {
    const result = await readExif(resolve(dir, "nope.jpg"));
    expect(result.data).toEqual({});
    expect(result.warning?.issues).toContain("corrupt EXIF");
  });

  it("reads EXIF embedded in a WebP container (e.g. darktable export)", async () => {
    const webpPath = resolve(dir, "with-exif.webp");
    await writeFile(
      webpPath,
      await sharp({
        create: { width: 16, height: 16, channels: 3, background: "#444444" },
      })
        .withExif({
          IFD0: {
            Make: "Canon",
            Model: "Canon EOS 5D Mark IV",
            Software: "darktable",
          },
          IFD2: {
            DateTimeOriginal: "2024:11:11 22:49:08",
            LensModel: "EF50mm f/1.4 USM",
            CameraOwnerName: "Jane Doe",
            RecommendedExposureIndex: "200",
            FNumber: "2.0",
            FocalLength: "50",
            ExposureTime: "1/250",
          },
        })
        .webp()
        .toBuffer(),
    );

    const result = await readExif(webpPath);
    expect(result.warning).toBeUndefined();
    expect(result.data.camera).toBe("Canon EOS 5D Mark IV");
    expect(result.data.lens).toBe("EF50mm f/1.4 USM");
    expect(result.data.photographer).toBe("Jane Doe");
    expect(result.data.iso).toBe(200);
    expect(result.data.aperture).toBe(2);
    expect(result.data.focal_length).toBe(50);
    expect(result.data.shutter_speed).toBe("1/250");
    // Evening wall-clock date must not shift to 2024-11-12 in negative UTC offsets
    expect(result.data.date?.toISOString().split("T")[0]).toBe("2024-11-11");
  });

  it("warns with no EXIF data on a WebP without metadata", async () => {
    const emptyWebpPath = resolve(dir, "no-exif.webp");
    await writeFile(
      emptyWebpPath,
      await sharp({
        create: { width: 8, height: 8, channels: 3, background: "#222222" },
      })
        .webp()
        .toBuffer(),
    );

    const result = await readExif(emptyWebpPath);
    expect(result.data).toEqual({});
    expect(result.warning?.issues).toContain("no EXIF data");
  });

  it("falls back to APEX ApertureValue and ShutterSpeedValue when FNumber and ExposureTime are missing", async () => {
    const apexPath = resolve(dir, "apex-only.jpg");
    await writeFile(
      apexPath,
      await sharp({
        create: { width: 8, height: 8, channels: 3, background: "#888888" },
      })
        .withExif({
          IFD0: { Make: "Canon", Model: "AE-1" },
          IFD2: {
            DateTimeOriginal: "2024:05:10 10:00:00",
            LensModel: "Canon FD 50mm 1:1.8",
            // Av = 3 => f/2.8 (2^(3/2) ≈ 2.828 -> 2.8)
            ApertureValue: "3",
            // Tv = 8 => 1/256s (2^(-8) = 1/256)
            ShutterSpeedValue: "8",
          },
        })
        .jpeg()
        .toBuffer(),
    );

    const result = await readExif(apexPath);
    expect(result.warning).toBeUndefined();
    expect(result.data.camera).toBe("Canon AE-1");
    expect(result.data.aperture).toBe(2.8);
    expect(result.data.shutter_speed).toBe("1/256");
  });
});

describe("readExif — real-world CC0 camera brand fixtures", () => {
  it("parses Canon (Canon EOS 6D + EF24-105mm f/4L IS USM + GPS)", async () => {
    const result = await readExif(resolve(EXIF_FIXTURES_DIR, "canon.jpg"));
    expect(result.warning).toBeUndefined();
    expect(result.data.camera).toBe("Canon EOS 6D");
    expect(result.data.lens).toBe("EF24-105mm f/4L IS USM");
    expect(result.data.focal_length).toBe(32);
    expect(result.data.aperture).toBe(10);
    expect(result.data.iso).toBe(100);
    expect(result.data.shutter_speed).toBe("1/125");
    expect(result.data.date?.toISOString().split("T")[0]).toBe("2019-05-12");
    expect(result.data.gps_lat).toBeCloseTo(50.912, 2);
    expect(result.data.gps_lon).toBeCloseTo(10.387, 2);
  });

  it("parses Nikon (NIKON CORPORATION / NIKON D600 + XMP rational exposure tags)", async () => {
    const result = await readExif(resolve(EXIF_FIXTURES_DIR, "nikon.jpg"));
    expect(result.warning).toBeUndefined();
    expect(result.data.camera).toBe("NIKON D600");
    expect(result.data.lens).toBe("28.0-300.0 mm f/3.5-5.6");
    expect(result.data.focal_length).toBe(210);
    expect(result.data.aperture).toBe(7.1);
    expect(result.data.shutter_speed).toBe("1/1250");
    expect(result.data.date?.toISOString().split("T")[0]).toBe("2025-05-31");
  });

  it("parses Sony (SONY / ILCE-7 + FE 24-240mm F3.5-6.3 OSS)", async () => {
    const result = await readExif(resolve(EXIF_FIXTURES_DIR, "sony.jpg"));
    expect(result.warning).toBeUndefined();
    expect(result.data.camera).toBe("SONY ILCE-7");
    expect(result.data.lens).toBe("FE 24-240mm F3.5-6.3 OSS");
    expect(result.data.focal_length).toBe(32);
    expect(result.data.aperture).toBe(11);
    expect(result.data.iso).toBe(100);
    expect(result.data.shutter_speed).toBe("1/30");
    expect(result.data.date?.toISOString().split("T")[0]).toBe("2016-02-24");
  });

  it("parses Fujifilm (FUJIFILM / X-T3 + XF14mmF2.8 R)", async () => {
    const result = await readExif(resolve(EXIF_FIXTURES_DIR, "fujifilm.jpg"));
    expect(result.warning).toBeUndefined();
    expect(result.data.camera).toBe("FUJIFILM X-T3");
    expect(result.data.lens).toBe("XF14mmF2.8 R");
    expect(result.data.focal_length).toBe(14);
    expect(result.data.aperture).toBe(7.1);
    expect(result.data.iso).toBe(1600);
    expect(result.data.shutter_speed).toBe("1/15");
    expect(result.data.date?.toISOString().split("T")[0]).toBe("2019-06-08");
  });

  it("parses Leica (LEICA CAMERA AG / LEICA Q (Typ 116))", async () => {
    const result = await readExif(resolve(EXIF_FIXTURES_DIR, "leica.jpg"));
    expect(result.warning).toBeUndefined();
    expect(result.data.camera).toBe("LEICA Q (Typ 116)");
    expect(result.data.lens).toBe("28.0 mm f/1.7");
    expect(result.data.focal_length).toBe(28);
    expect(result.data.aperture).toBe(2.5);
    expect(result.data.iso).toBe(400);
    expect(result.data.shutter_speed).toBe("1/60");
    expect(result.data.date?.toISOString().split("T")[0]).toBe("2016-04-13");
  });

  it("parses Olympus / OM System (OLYMPUS CORPORATION / E-M1MarkII)", async () => {
    const result = await readExif(resolve(EXIF_FIXTURES_DIR, "olympus.jpg"));
    expect(result.warning).toBeUndefined();
    expect(result.data.camera).toBe("OLYMPUS E-M1MarkII");
    expect(result.data.lens).toBe("OLYMPUS M.14-150mm F4.0-5.6 II");
    expect(result.data.focal_length).toBe(70);
    expect(result.data.aperture).toBe(6.3);
    expect(result.data.iso).toBe(1600);
    expect(result.data.shutter_speed).toBe("1/800");
    expect(result.data.date?.toISOString().split("T")[0]).toBe("2021-05-21");
  });

  it("parses Panasonic Lumix (Panasonic / DMC-GX8 + LEICA DG 100-400/F4.0-6.3)", async () => {
    const result = await readExif(resolve(EXIF_FIXTURES_DIR, "panasonic.jpg"));
    expect(result.warning).toBeUndefined();
    expect(result.data.camera).toBe("Panasonic DMC-GX8");
    expect(result.data.lens).toBe("LEICA DG 100-400/F4.0-6.3");
    expect(result.data.focal_length).toBe(400);
    expect(result.data.aperture).toBe(6.3);
    expect(result.data.iso).toBe(200);
    expect(result.data.shutter_speed).toBe("1/400");
    expect(result.data.date?.toISOString().split("T")[0]).toBe("2018-05-10");
  });

  it("parses Pentax / Ricoh (RICOH IMAGING COMPANY, LTD. / PENTAX KP)", async () => {
    const result = await readExif(resolve(EXIF_FIXTURES_DIR, "pentax.jpg"));
    expect(result.warning).toBeUndefined();
    expect(result.data.camera).toBe("PENTAX KP");
    expect(result.data.lens).toBe("300 mm f/--");
    expect(result.data.focal_length).toBe(300);
    expect(result.data.aperture).toBe(6.3);
    expect(result.data.iso).toBe(200);
    expect(result.data.shutter_speed).toBe("1/800");
    expect(result.data.date?.toISOString().split("T")[0]).toBe("2019-04-07");
  });

  it("parses Apple iPhone (Apple / iPhone 5 + fractional focal length)", async () => {
    const result = await readExif(resolve(EXIF_FIXTURES_DIR, "apple.jpg"));
    expect(result.warning).toBeUndefined();
    expect(result.data.camera).toBe("Apple iPhone 5");
    expect(result.data.lens).toBe("iPhone 5 back camera 4.12mm f/2.4");
    expect(result.data.focal_length).toBe(4.12);
    expect(result.data.aperture).toBe(2.4);
    expect(result.data.iso).toBe(3200);
    expect(result.data.shutter_speed).toBe("1/120");
    expect(result.data.date?.toISOString().split("T")[0]).toBe("2015-01-15");
  });
});
