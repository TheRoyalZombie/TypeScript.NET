﻿/*
* @author electricessence / https://github.com/electricessence/
* Based upon .NET source.
* Licensing: MIT https://github.com/electricessence/TypeScript.NET/blob/master/LICENSE
*/

module System
{

	export interface IComparable<T>
	{
		compareTo(other: T): number;
	}

} 