# mynosql

Arbitary(ish) queries for leveldb.

[levelup#283](https://github.com/rvagg/node-levelup/issues/283)

### thinking out loud

Okay so what happens when a query and a scan are concurrent?

The scan produces a temp, in memory index...
The interface to this should be a pull stream,
just like a stream read from disk.

A scan should always cover the entire database...
but sometimes more data will be written before it has completed.
If we have a Write Ahead Log.

Ideas

keep all the documents that are added during the scan.
Scan through them at the end of the scan.

If we read while the indexes are being written.

---

Avoid the tricky cases (writes while updating indexes)
just breifly delay those writes. It's a rare case,
so don't worry about it... or optimize it later.

---

# Manual indexes

for now, manual indexes.

## start up:

1. pause reads & writes
2. read current indexes into mem
3. unpause reads & writes

## create an index

1. scan database, build indexes.
2. pause writes
3. write indexes
4. unpause writes

## query

1. select an index / decide query strategy
2. perform query.

### pausing writes

pausing writes needs to be async.
you need to handle any writes that have
succeeded before writing the indexes.
Just keep a counter of inflight and landed writes,
and do not pause if they are not equal.

## License

MIT
