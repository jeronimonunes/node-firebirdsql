/// <reference types="node" />

import { EventEmitter } from 'events';
import { Readable } from 'stream';

declare namespace Firebird {
  type Callback<T = void> = (err: Error | null, result?: T) => void;

  interface AttachOptions {
    host?: string;
    port?: number;
    database?: string;
    filename?: string;
    user?: string;
    password?: string;
    role?: string;
    pageSize?: number;
  }

  type Isolation = ReadonlyArray<number>;

  const ISOLATION_READ_UNCOMMITTED: Isolation;
  const ISOLATION_READ_COMMITED: Isolation;
  const ISOLATION_REPEATABLE_READ: Isolation;
  const ISOLATION_SERIALIZABLE: Isolation;
  const ISOLATION_READ_COMMITED_READ_ONLY: Isolation;

  type QueryValue = string | number | boolean | Date | Buffer | Readable | Record<string, any> | null | undefined;
  type QueryValues = QueryValue | ReadonlyArray<QueryValue>;

  interface StatementOptions {
    asObject?: boolean;
    asStream?: boolean;
    on?(row: Row, index: number): void;
  }

  type RowArray = any[];
  interface RowObject {
    [column: string]: any;
  }
  type Row = RowArray | RowObject;

  interface ColumnMetadata {
    alias: string;
    type: number;
    subType?: number;
    scale?: number;
    length?: number;
    relation?: string;
    relationAlias?: string;
    field?: string;
    owner?: string;
    nullable?: boolean;
  }

  interface FetchResult<T extends Row = RowArray> {
    data: T[] | null;
    fetched: boolean;
  }

  type QueryResult<T extends Row = RowArray> = T[] | T | null | undefined;

  type QueryCallback<T extends Row = RowArray> = (
    err: Error | null,
    result?: QueryResult<T>,
    meta?: ColumnMetadata[],
    isSelect?: boolean
  ) => void;

  type SequentialHandler<T extends Row = RowObject> = (row: T, index: number) => void;

  function escape(value: QueryValue): string;
  function attach(options: AttachOptions, callback: Callback<Database>): void;
  function create(options: AttachOptions, callback: Callback<Database>): void;
  function attachOrCreate(options: AttachOptions, callback: Callback<Database>): void;
  function pool(max: number, options: AttachOptions, callback?: Callback<Pool>): Pool;

  class Pool {
    readonly db: Database[];
    readonly pending: Array<(err: Error | null, db?: Database) => void>;
    isReady: boolean;
    get(callback: Callback<Database>): this;
    check(): this;
    detach(): this;
    destroy(): this;
  }

  class Database extends EventEmitter {
    constructor(connection: Connection);
    readonly connection: Connection;

    escape(value: QueryValue): string;
    detach(callback?: Callback<void>, force?: boolean): this;
    transaction(callback: Callback<Transaction>): this;
    transaction(isolation: Isolation, callback: Callback<Transaction>): this;
    startTransaction(callback: Callback<Transaction>): this;
    startTransaction(isolation: Isolation, callback: Callback<Transaction>): this;
    newStatement(query: string, callback: Callback<Statement>): this;

    execute(query: string, callback?: QueryCallback<RowArray>, options?: StatementOptions): this;
    execute(query: string, params: QueryValues, callback?: QueryCallback<RowArray>, options?: StatementOptions): this;

    query(query: string, callback?: QueryCallback<RowObject>): this;
    query(query: string, params: QueryValues, callback?: QueryCallback<RowObject>): this;

    sequentially<T extends Row = RowObject>(
      query: string,
      params: QueryValues,
      onRow: SequentialHandler<T>,
      done?: QueryCallback<T>,
      asArray?: boolean
    ): this;
    sequentially<T extends Row = RowObject>(
      query: string,
      onRow: SequentialHandler<T>,
      done?: QueryCallback<T>,
      asArray?: boolean
    ): this;

    on(event: 'row', listener: (row: Row, index: number, isObjectMode: boolean) => void): this;
    on(event: 'result', listener: (rows: Row[] | null) => void): this;
    on(event: 'attach', listener: (info?: any) => void): this;
    on(event: 'detach', listener: (isPoolConnection: boolean) => void): this;
    on(event: 'reconnect', listener: () => void): this;
    on(event: 'error', listener: (error: Error) => void): this;
    on(event: 'transaction', listener: (isolation?: Isolation | null) => void): this;
    on(event: 'commit', listener: () => void): this;
    on(event: 'rollback', listener: () => void): this;
    on(event: string, listener: (...args: any[]) => void): this;
  }

  class Transaction {
    readonly connection: Connection;
    readonly db: Database;

    newStatement(query: string, callback: Callback<Statement>): void;

    execute(query: string, callback?: QueryCallback<RowArray>, options?: StatementOptions): void;
    execute(query: string, params: QueryValues, callback?: QueryCallback<RowArray>, options?: StatementOptions): void;

    query(query: string, callback?: QueryCallback<RowObject>): void;
    query(query: string, params: QueryValues, callback?: QueryCallback<RowObject>): void;

    commit(callback?: Callback<void>): void;
    rollback(callback?: Callback<void>): void;
    commitRetaining(callback?: Callback<void>): void;
    rollbackRetaining(callback?: Callback<void>): void;
  }

  class Statement {
    readonly connection: Connection;
    readonly handle: number;
    readonly query?: string;
    readonly plan?: string;
    readonly type?: number;
    readonly input: ColumnMetadata[];
    readonly output: ColumnMetadata[];
    custom?: StatementOptions;

    execute(transaction: Transaction, callback?: QueryCallback<RowArray>, options?: StatementOptions): void;
    execute(transaction: Transaction, params: QueryValues, callback?: QueryCallback<RowArray>, options?: StatementOptions): void;

    fetch(transaction: Transaction | undefined, callback: Callback<FetchResult>): void;
    fetch(transaction: Transaction | undefined, count: number, callback: Callback<FetchResult>): void;

    fetchAll(transaction: Transaction | undefined, callback: Callback<Row[] | null>): void;

    close(callback?: Callback<void>): void;
    drop(callback?: Callback<void>): void;
  }

  interface BlobId {
    low: number;
    high: number;
  }

  interface BlobHandle extends BlobId {
    handle: number;
  }

  class Connection {
    constructor(host: string, port: number, callback: Callback<void>, options: AttachOptions, db?: Database);

    readonly db?: Database;
    readonly options: AttachOptions & { isPool?: boolean };

    connect(database: string | undefined, callback: Callback<void>): void;
    attach(options: AttachOptions, callback: Callback<Database>, db?: Database): void;
    detach(callback?: Callback<void>, force?: boolean): void;
    createDatabase(options: AttachOptions, callback: Callback<Database>): void;

    startTransaction(callback: Callback<Transaction>): void;
    startTransaction(isolation: Isolation, callback: Callback<Transaction>): void;

    commit(transaction: Transaction, callback?: Callback<void>): void;
    rollback(transaction: Transaction, callback?: Callback<void>): void;
    commitRetaining(transaction: Transaction, callback?: Callback<void>): void;
    rollbackRetaining(transaction: Transaction, callback?: Callback<void>): void;

    allocateStatement(callback: Callback<Statement>): void;
    dropStatement(statement: Statement, callback?: Callback<void>): void;
    closeStatement(statement: Statement, callback?: Callback<void>): void;

    prepareStatement(transaction: Transaction, statement: Statement, query: string, callback: Callback<Statement>): void;
    prepareStatement(
      transaction: Transaction,
      statement: Statement,
      query: string,
      plan: boolean,
      callback: Callback<Statement>
    ): void;

    executeStatement(transaction: Transaction, statement: Statement, callback?: Callback<FetchResult>, options?: StatementOptions): void;
    executeStatement(
      transaction: Transaction,
      statement: Statement,
      params: QueryValues,
      callback?: Callback<FetchResult>,
      options?: StatementOptions
    ): void;

    fetch(statement: Statement, transaction: Transaction | undefined, callback: Callback<FetchResult>): void;
    fetch(statement: Statement, transaction: Transaction | undefined, count: number, callback: Callback<FetchResult>): void;

    fetchAll(statement: Statement, transaction: Transaction | undefined, callback: Callback<Row[] | null>): void;

    openBlob(blob: BlobId | BlobHandle, transaction: Transaction, callback: Callback<BlobHandle>): void;
    closeBlob(blob: BlobHandle, callback?: Callback<void>): void;
    getSegment(blob: BlobHandle, callback: Callback<{ buffer: Buffer; handle: number }>): void;
    createBlob2(transaction: Transaction, callback: Callback<BlobHandle>): void;
    batchSegments(blob: BlobHandle, buffer: Buffer, callback?: Callback<void>): void;

    disconnect(): void;
  }

  interface FirebirdStatic {
    ISOLATION_READ_UNCOMMITTED: Isolation;
    ISOLATION_READ_COMMITED: Isolation;
    ISOLATION_REPEATABLE_READ: Isolation;
    ISOLATION_SERIALIZABLE: Isolation;
    ISOLATION_READ_COMMITED_READ_ONLY: Isolation;
    escape: typeof escape;
    attach: typeof attach;
    create: typeof create;
    attachOrCreate: typeof attachOrCreate;
    pool: typeof pool;
    Connection: typeof Connection;
  }
}

declare const Firebird: Firebird.FirebirdStatic;

export = Firebird;