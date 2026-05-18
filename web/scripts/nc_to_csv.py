from pathlib import Path

import pandas as pd

try:
    import xarray as xr
except Exception:
    xr = None

PROJECT_ROOT = Path(__file__).resolve().parents[2]
INPUT_DIR = PROJECT_ROOT / "docs" / "data" / "raw"
OUTPUT_DIR = PROJECT_ROOT / "docs" / "data" / "processed"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

FINAL_COLUMNS = [
    "sea_level_m",
    "temperature_C",
    "dissolved_o2",
    "salinity_psu",
    "current_u",
    "current_v",
    "current_speed_m_s",
    "ph",
    "turbidity_kd",
]


def extract_timeseries(nc_file, variables):
    nc_path = Path(nc_file)
    if xr is None:
        print(f"⚠️  xarray is not available, skipping raw NetCDF file '{nc_path.name}'.")
        return None
    if not nc_path.exists():
        print(f"⚠️  File '{nc_path}' not found, skipping.")
        return None
    ds = xr.open_dataset(nc_path)
    print(f"\n📂 {nc_path}")
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
    df["time"] = pd.to_datetime(df["time"]).dt.tz_localize(None).dt.normalize()
    df = df.sort_values("time").drop_duplicates("time").reset_index(drop=True)
    print(f"   → {len(df)} времеви точки")
    return df


df_temp = extract_timeseries(INPUT_DIR / "temperature.nc", ["thetao"])
df_ssh = extract_timeseries(INPUT_DIR / "sea-level.nc", ["zos"])
df_bgc = extract_timeseries(INPUT_DIR / "pp-n-o2.nc", ["o2"])
df_sal = extract_timeseries(INPUT_DIR / "salinity.nc", ["so"])
df_curr = extract_timeseries(INPUT_DIR / "currents.nc", ["uo", "vo"])
df_ph = extract_timeseries(INPUT_DIR / "ph.nc", ["ph"])
df_turb = extract_timeseries(INPUT_DIR / "turbidity.nc", ["kd"])

if df_temp is not None:
    df_temp = df_temp.rename(columns={"thetao": "temperature_C"})
if df_ssh is not None:
    df_ssh = df_ssh.rename(columns={"zos": "sea_level_m"})
if df_bgc is not None:
    df_bgc = df_bgc.rename(columns={"o2": "dissolved_o2"})
if df_sal is not None:
    df_sal = df_sal.rename(columns={"so": "salinity_psu"})
if df_curr is not None:
    df_curr = df_curr.rename(columns={"uo": "current_u", "vo": "current_v"})
    df_curr["current_speed_m_s"] = (df_curr["current_u"] ** 2 + df_curr["current_v"] ** 2) ** 0.5
if df_ph is not None:
    df_ph = df_ph.rename(columns={"ph": "ph"})
if df_turb is not None:
    df_turb = df_turb.rename(columns={"kd": "turbidity_kd"})

for name, df in [
    ("temperature", df_temp),
    ("sea_level", df_ssh),
    ("o2", df_bgc),
    ("salinity", df_sal),
    ("currents", df_curr),
    ("ph", df_ph),
    ("turbidity", df_turb),
]:
    if df is not None:
        df.to_csv(OUTPUT_DIR / f"{name}.csv", index=False)
        print(f"✅ {name}.csv ({len(df)} реда, колони: {list(df.columns)})")

print("\n🔗 Обединяване в burgas_final.csv...")

# Ако липсват raw файлове, използвай вече създадените processed CSV като резервен източник
def _load_csv_if_missing(var_name, df):
    path = OUTPUT_DIR / f"{var_name}.csv"
    if df is None and path.exists():
        d = pd.read_csv(path, parse_dates=["time"])
        d["time"] = pd.to_datetime(d["time"]).dt.normalize()
        print(f"   ℹ️ Зареден {var_name}.csv ({len(d)} реда) като fallback")
        return d
    return df

df_temp = _load_csv_if_missing("temperature", df_temp)
df_ssh = _load_csv_if_missing("sea_level", df_ssh)
df_bgc = _load_csv_if_missing("o2", df_bgc)
df_sal = _load_csv_if_missing("salinity", df_sal)
df_curr = _load_csv_if_missing("currents", df_curr)
df_ph = _load_csv_if_missing("ph", df_ph)
df_turb = _load_csv_if_missing("turbidity", df_turb)

all_dfs = [
    (df_ssh, "sea_level"),
    (df_temp, "temperature"),
    (df_bgc, "bgc"),
    (df_sal, "salinity"),
    (df_curr, "currents"),
    (df_ph, "ph"),
    (df_turb, "turbidity"),
]
all_dfs = [(df, name) for df, name in all_dfs if df is not None]

if not all_dfs:
    print("No dataframes to merge.")
else:
    # Outer-join by time index across all available frames so we don't drop rows
    frames = []
    for df, label in all_dfs:
        d = df.copy()
        if "time" in d.columns:
            d = d.set_index("time")
        frames.append(d)

    combined = pd.concat(frames, axis=1, join="outer")
    combined.index = pd.to_datetime(combined.index)
    combined = combined.sort_index()

    # Interpolate and fill missing values across time to produce a continuous training seed
    combined = combined.interpolate(method="time").ffill().bfill()

    final = combined.reset_index().rename(columns={"index": "time"})
    final = final[["time"] + [column for column in FINAL_COLUMNS if column in final.columns]]
    final.to_csv(OUTPUT_DIR / "burgas_final.csv", index=False)

    print(f"\n✅ burgas_final.csv записан!")
    print(f"   Редове: {len(final)}")
    print(f"   Колони: {list(final.columns)}")
    print(f"\n{final.head(5)}")
