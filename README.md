# sberAMM

Sberbank Hackathon AMM

## Constant Product Function

This swap contract uses the formula:  

```math
{x * y = k}
``` 

## Calculating change in x from change in y:

From:  
```math
{x * y = k}
```

We can deduce:  
```math
{k = (x+dx) * (y+dy)} 
```  
  
We then arrive at the following:  
```math
{dy = \frac{(-dx*y)} {(dx + x)}}
```  


## Lets say that we have the following scenario:  

amount of tokens X in the contract = 5  
amount of tokens Y in the contract = 10  

A user comes along and they want to give us 1 of token X in exchange for token Y.

Following the formula constant product formula (x * y = k), we need to calculate the change of Y given a change in X.  

```
x = 5
y = 10
k = 50
dx = 1 

k = (x+1) * (y+dy)

50 = (5+1) * (10+dy)
50 = 6 * (10 + dy)
50 = 60 + 6dy
-10 = 6dy
-10/6 = dy
-1.666 = dy


amountOut = (-dx * y) / (dx + x)
```

## Constant Product Function given x = 5, y = 10, dx = 1

<p align="center">
   <img src="./doc/curve.png">
</p>

## Stable Swap Invariant Curve
```
1. D = Ax + Ay - A * (Ax^2 / Ax + Ay^2 / Ay)
2. rx = (Ax + Dx) / Ax
3. b = (Ax * (rx - A / rx)) / Ay - D / Ay
4. ry = ((b^2 + 4 * A)^0.5 - b) / 2
5. Dy = Ay * ry - Ay
```

### Deploying 
npx hardhat run scripts/deploy.ts --netowork polygon-mumbai

#### Deploying on Siberium (currently not working)
npx hardhat run scripts/deploy.ts --network siberium

### Verifying 
npx hardhat verify --network polygon-mumbai 0x776962a6a94ee472CF8E0E05156BdB5A0Aa5Bf3c

### Running prettier
npx prettier --write '**/*.sol'


### Desmos Functions: 
https://www.desmos.com/calculator/h0pq2vbph7