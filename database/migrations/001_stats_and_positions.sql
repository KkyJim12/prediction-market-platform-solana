BEGIN;

CREATE TABLE IF NOT EXISTS users (
  wallet_address varchar(44) PRIMARY KEY,
  volume_base_units numeric(20, 0) NOT NULL DEFAULT 0,
  realized_pnl_base_units numeric(21, 0) NOT NULL DEFAULT 0,
  base_volume_base_units numeric(20, 0) NOT NULL DEFAULT 0,
  trades integer NOT NULL DEFAULT 0,
  wins integer NOT NULL DEFAULT 0,
  losses integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS positions (
  position_id char(64) PRIMARY KEY,
  bet_address varchar(44) NOT NULL UNIQUE,
  wallet_address varchar(44) NOT NULL REFERENCES users(wallet_address),
  market_address varchar(44) NOT NULL,
  fixture_id varchar(64) NOT NULL,
  competition varchar(160) NOT NULL DEFAULT '',
  home_team varchar(160) NOT NULL DEFAULT '',
  away_team varchar(160) NOT NULL DEFAULT '',
  selection varchar(160) NOT NULL DEFAULT '',
  outcome smallint NOT NULL CHECK (outcome BETWEEN 0 AND 2),
  stake_base_units numeric(20, 0) NOT NULL CHECK (stake_base_units > 0),
  locked_odds bigint NOT NULL CHECK (locked_odds > 0),
  potential_payout_base_units numeric(20, 0) NOT NULL,
  amount_paid_base_units numeric(20, 0),
  status varchar(12) NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'won', 'lost', 'voided')),
  open_signature varchar(100) NOT NULL UNIQUE,
  settle_signature varchar(100) UNIQUE,
  opened_at timestamptz NOT NULL DEFAULT now(),
  finalized_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS positions_wallet_opened_idx
  ON positions (wallet_address, opened_at DESC);
CREATE INDEX IF NOT EXISTS positions_status_idx ON positions (status);

CREATE OR REPLACE FUNCTION refresh_user_stats(target_wallet varchar)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO users (wallet_address)
  VALUES (target_wallet)
  ON CONFLICT (wallet_address) DO NOTHING;

  UPDATE users
  SET
    volume_base_units = totals.volume,
    base_volume_base_units = totals.base_volume,
    realized_pnl_base_units = totals.realized_pnl,
    trades = totals.trades,
    wins = totals.wins,
    losses = totals.losses,
    updated_at = now()
  FROM (
    SELECT
      COALESCE(sum(potential_payout_base_units), 0) AS volume,
      COALESCE(sum(stake_base_units), 0) AS base_volume,
      COALESCE(sum(
        CASE
          WHEN status = 'won' THEN COALESCE(amount_paid_base_units, potential_payout_base_units) - stake_base_units
          WHEN status = 'lost' THEN -stake_base_units
          ELSE 0
        END
      ), 0) AS realized_pnl,
      count(*)::integer AS trades,
      count(*) FILTER (WHERE status = 'won')::integer AS wins,
      count(*) FILTER (WHERE status = 'lost')::integer AS losses
    FROM positions
    WHERE wallet_address = target_wallet
  ) totals
  WHERE users.wallet_address = target_wallet;
END;
$$;

CREATE OR REPLACE FUNCTION positions_refresh_user_stats()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM refresh_user_stats(OLD.wallet_address);
    RETURN OLD;
  END IF;

  PERFORM refresh_user_stats(NEW.wallet_address);
  IF TG_OP = 'UPDATE' AND OLD.wallet_address <> NEW.wallet_address THEN
    PERFORM refresh_user_stats(OLD.wallet_address);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS positions_stats_trigger ON positions;
CREATE TRIGGER positions_stats_trigger
AFTER INSERT OR UPDATE OR DELETE ON positions
FOR EACH ROW EXECUTE FUNCTION positions_refresh_user_stats();

COMMIT;
