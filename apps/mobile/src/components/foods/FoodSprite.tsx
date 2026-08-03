import React from 'react';
import { View } from 'react-native';
import { AtlasFrame } from '../sprites/AtlasFrame';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const FOOD_ATLAS = require('../../../assets/foods/ad-sidera-food-atlas-v1.png');
const COLUMN_BY_FOOD: Record<string, number> = {
  astral_fruit: 0, mist_biscuit: 1, golden_root: 2, celestial_nectar: 3, lunar_seed: 4,
};

export function FoodSprite({ foodKey, name, size = 58 }: { foodKey: string; name: string; size?: number }): React.ReactElement {
  return <View style={{ width: size, height: size }}><AtlasFrame source={FOOD_ATLAS} columns={5} rows={1}
    column={COLUMN_BY_FOOD[foodKey] ?? 0} row={0} size={size} atlasAspectRatio={3}
    accessibilityLabel={name} tag={`comida:${foodKey}`} /></View>;
}
