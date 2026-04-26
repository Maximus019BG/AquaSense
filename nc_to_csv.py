import xarray as xr
import pandas as pd
import os

INPUT_DIR = "./docs/raw_data"
OUTPUT_DIR = "./docs/processed"
os.makedirs(OUTPUT_DIR, exist_ok=True)

def extract_timeseries(nc_file, variables):
    ds = xr.open_dataset(nc_file)
    print(f"\n📂 {nc_file}")
    print(f"   Dimensions: {dict(ds.sizes)}")
    print(f"   Variables:  {list(ds.data_vars)}")
    print(f"   Time range: {ds.time.values[0]} → {ds.time.values[-1]}")

    frames = []
    for var in variables:
        if var not in ds:
            print(f"   ⚠️  Variable '{var}' not found, skipping.")
            continue
        da = ds[var]
        dims_to_avg = [d for d in da.dims if d != "time"]
        series = da.mean(dim=dims_to_avg)
        frames.append(series.to_dataframe(name=var)[var])

    ds.close()

    if not frames:
        print("   ❌ No usable variables found.")
        return None

    df = pd.concat(frames, axis=1).reset_index()
    # Запази само датата (без час/timezone)
    df["time"] = pd.to_datetime(df["time"]).dt.tz_localize(None).dt.normalize()
    df = df.sort_values("time").drop_duplicates("time").reset_index(drop=True)
    print(f"   → {len(df)} времеви точки")
    return df


# ── Извличане ──────────────────────────────────────────────────────────────
df_temp     = extract_timeseries(f"{INPUT_DIR}/temperature.nc", ["thetao"])
df_ssh      = extract_timeseries(f"{INPUT_DIR}/sea-level.nc",   ["zos"])
df_bgc      = extract_timeseries(f"{INPUT_DIR}/pp-n-o2.nc",   ["o2", "nppv"])
df_sal      = extract_timeseries(f"{INPUT_DIR}/salinity.nc",    ["so"])
df_nut      = extract_timeseries(f"{INPUT_DIR}/nutrients.nc",   ["no3", "po4"])

# ── Преименуване ───────────────────────────────────────────────────────────
if df_temp is not None: df_temp = df_temp.rename(columns={"thetao": "temperature_C"})
if df_ssh  is not None: df_ssh  = df_ssh.rename(columns={"zos": "sea_level_m"})
if df_bgc  is not None: df_bgc  = df_bgc.rename(columns={"o2": "dissolved_o2", "nppv": "primary_production"})
if df_sal  is not None: df_sal  = df_sal.rename(columns={"so": "salinity_psu"})
if df_nut  is not None: df_nut  = df_nut.rename(columns={"no3": "nitrate", "po4": "phosphate"})

# ── Запис на отделни CSV-та ────────────────────────────────────────────────
for name, df in [
    ("temperature",  df_temp),
    ("sea_level",    df_ssh),
    ("o2",           df_bgc),
    ("salinity",     df_sal),
    ("nutrients",    df_nut),
]:
    if df is not None:
        df.to_csv(f"{OUTPUT_DIR}/{name}.csv", index=False)
        print(f"✅ {name}.csv ({len(df)} реда, колони: {list(df.columns)})")

# ── Обединяване по най-близка дата ─────────────────────────────────────────
print("\n🔗 Обединяване в burgas_final.csv...")

# Вземи файла с най-много точки като база
all_dfs = [(df_ssh, "sea_level"), (df_temp, "temperature"),
           (df_bgc, "bgc"), (df_sal, "salinity"), (df_nut, "nutrients")]
all_dfs = [(df, name) for df, name in all_dfs if df is not None]

base = all_dfs[0][0].copy()

for df, label in all_dfs[1:]:
    base = pd.merge_asof(
        base.sort_values("time"),
        df.sort_values("time"),
        on="time",
        direction="nearest",
        tolerance=pd.Timedelta("5D")
    )
    print(f"   + {label}: {len(base)} реда след merge")

final = base.dropna().sort_values("time").reset_index(drop=True)
final.to_csv(f"{OUTPUT_DIR}/burgas_final.csv", index=False)

print(f"\n✅ burgas_final.csv записан!")
print(f"   Редове: {len(final)}")
print(f"   Колони: {list(final.columns)}")
print(f"\n{final.head(5)}")