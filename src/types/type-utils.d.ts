type Dict<T> = {[k: string]: T};

type KeyedDict<T, U> = {[K in keyof T]: U};

type PartialKeyedDict<T, U> = {[K in keyof T]?: U};

type PromiseResolve<T> = (value?: T | PromiseLike<T> | undefined) => void;

/*
* Credit to ts-essentials (MIT licensed)
*
* https://github.com/krzkaczor/ts-essentials
*/

type PrimitiveType = string | number | boolean | bigint | symbol | undefined | null;

type DeepReadonly<T> =
	T extends PrimitiveType | Function | Date
	? T
	: T extends Map<infer K, infer V>
	? IReadonlyMap<K, V>
	: T extends Set<infer U>
	? IReadonlySet<U>
	: T extends {}
	? { readonly [K in keyof T]: DeepReadonly<T[K]> }
	: Readonly<T>;

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface IReadonlySet<V> extends ReadonlySet<DeepReadonly<V>> {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface IReadonlyMap<K, V> extends ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>> {}

type DeepWritable<T> =
	T extends PrimitiveType | Function | Date
	? T
	: T extends Map<infer K, infer V>
	? IWritableMap<K, V>
	: T extends Set<infer U>
	? IWritableSet<U>
	: T extends {}
	? { -readonly [K in keyof T]: DeepWritable<T[K]> }
	: T;

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface IWritableSet<V> extends Set<DeepWritable<V>> {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface IWritableMap<K, V> extends Map<DeepWritable<K>, DeepWritable<V>> {}
