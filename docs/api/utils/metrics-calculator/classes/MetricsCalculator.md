[**Ollama Code API Documentation v0.1.0**](../../../README.md)

***

[Ollama Code API Documentation](../../../modules.md) / [utils/metrics-calculator](../README.md) / MetricsCalculator

# Class: MetricsCalculator

Defined in: [utils/metrics-calculator.ts:28](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/utils/metrics-calculator.ts#L28)

## Constructors

### Constructor

> **new MetricsCalculator**(): `MetricsCalculator`

#### Returns

`MetricsCalculator`

## Methods

### calculateMovingAverage()

> `static` **calculateMovingAverage**(`currentAverage`, `newValue`, `alpha`, `isFirstValue`): `number`

Defined in: [utils/metrics-calculator.ts:32](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/utils/metrics-calculator.ts#L32)

Calculate exponential moving average

#### Parameters

##### currentAverage

`number`

##### newValue

`number`

##### alpha

`number` = `0.1`

##### isFirstValue

`boolean` = `false`

#### Returns

`number`

***

### updateMovingAverage()

> `static` **updateMovingAverage**(`state`, `newValue`): [`MovingAverageState`](../interfaces/MovingAverageState.md)

Defined in: [utils/metrics-calculator.ts:47](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/utils/metrics-calculator.ts#L47)

Update moving average state

#### Parameters

##### state

[`MovingAverageState`](../interfaces/MovingAverageState.md)

##### newValue

`number`

#### Returns

[`MovingAverageState`](../interfaces/MovingAverageState.md)

***

### calculateWeightedAverage()

> `static` **calculateWeightedAverage**\<`T`\>(`items`, `valueExtractor`): `number`

Defined in: [utils/metrics-calculator.ts:64](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/utils/metrics-calculator.ts#L64)

Calculate weighted average

#### Type Parameters

##### T

`T`

#### Parameters

##### items

[`WeightedItem`](../interfaces/WeightedItem.md)\<`T`\>[]

##### valueExtractor

(`item`) => `number`

#### Returns

`number`

***

### calculateSimpleWeightedAverage()

> `static` **calculateSimpleWeightedAverage**(`values`, `weights`): `number`

Defined in: [utils/metrics-calculator.ts:87](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/utils/metrics-calculator.ts#L87)

Calculate simple weighted average from arrays

#### Parameters

##### values

`number`[]

##### weights

`number`[]

#### Returns

`number`

***

### calculateStatistics()

> `static` **calculateStatistics**(`values`): [`StatisticalSummary`](../interfaces/StatisticalSummary.md)

Defined in: [utils/metrics-calculator.ts:106](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/utils/metrics-calculator.ts#L106)

Calculate statistical summary for an array of numbers

#### Parameters

##### values

`number`[]

#### Returns

[`StatisticalSummary`](../interfaces/StatisticalSummary.md)

***

### calculatePercentile()

> `static` **calculatePercentile**(`values`, `targetValue`): `number`

Defined in: [utils/metrics-calculator.ts:144](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/utils/metrics-calculator.ts#L144)

Calculate percentile for a value in a dataset

#### Parameters

##### values

`number`[]

##### targetValue

`number`

#### Returns

`number`

***

### calculateRate()

> `static` **calculateRate**(`count`, `timeWindowMs`): `number`

Defined in: [utils/metrics-calculator.ts:164](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/utils/metrics-calculator.ts#L164)

Calculate rate (requests per second, etc.)

#### Parameters

##### count

`number`

##### timeWindowMs

`number`

#### Returns

`number`

***

### calculateThroughput()

> `static` **calculateThroughput**(`totalRequests`, `totalTimeMs`, `windowSizeMs`): `object`

Defined in: [utils/metrics-calculator.ts:175](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/utils/metrics-calculator.ts#L175)

Calculate throughput metrics

#### Parameters

##### totalRequests

`number`

##### totalTimeMs

`number`

##### windowSizeMs

`number` = `60000`

#### Returns

`object`

##### requestsPerSecond

> **requestsPerSecond**: `number`

##### requestsPerMinute

> **requestsPerMinute**: `number`

##### averageRequestTime

> **averageRequestTime**: `number`

***

### calculateSuccessRate()

> `static` **calculateSuccessRate**(`successCount`, `totalCount`): `number`

Defined in: [utils/metrics-calculator.ts:198](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/utils/metrics-calculator.ts#L198)

Calculate success rate percentage

#### Parameters

##### successCount

`number`

##### totalCount

`number`

#### Returns

`number`

***

### calculateErrorRate()

> `static` **calculateErrorRate**(`errorCount`, `totalCount`): `number`

Defined in: [utils/metrics-calculator.ts:209](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/utils/metrics-calculator.ts#L209)

Calculate error rate percentage

#### Parameters

##### errorCount

`number`

##### totalCount

`number`

#### Returns

`number`

***

### calculateTimeDecay()

> `static` **calculateTimeDecay**(`ageMs`, `halfLifeMs`): `number`

Defined in: [utils/metrics-calculator.ts:219](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/utils/metrics-calculator.ts#L219)

Calculate exponential decay factor for time-based weighting

#### Parameters

##### ageMs

`number`

##### halfLifeMs

`number` = `300000`

#### Returns

`number`

***

### calculateWindowAverage()

> `static` **calculateWindowAverage**(`values`, `windowSizeMs`, `currentTime`): `number`

Defined in: [utils/metrics-calculator.ts:229](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/utils/metrics-calculator.ts#L229)

Calculate moving window average

#### Parameters

##### values

`object`[]

##### windowSizeMs

`number`

##### currentTime

`number` = `...`

#### Returns

`number`

***

### calculateCorrelation()

> `static` **calculateCorrelation**(`dataX`, `dataY`): `number`

Defined in: [utils/metrics-calculator.ts:247](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/utils/metrics-calculator.ts#L247)

Calculate correlation coefficient between two datasets

#### Parameters

##### dataX

`number`[]

##### dataY

`number`[]

#### Returns

`number`

***

### normalize()

> `static` **normalize**(`value`, `min`, `max`): `number`

Defined in: [utils/metrics-calculator.ts:279](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/utils/metrics-calculator.ts#L279)

Normalize value to 0-1 range based on min/max bounds

#### Parameters

##### value

`number`

##### min

`number`

##### max

`number`

#### Returns

`number`

***

### calculateRollingVariance()

> `static` **calculateRollingVariance**(`values`, `windowSize`): `number`[]

Defined in: [utils/metrics-calculator.ts:291](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/utils/metrics-calculator.ts#L291)

Calculate rolling variance

#### Parameters

##### values

`number`[]

##### windowSize

`number`

#### Returns

`number`[]
