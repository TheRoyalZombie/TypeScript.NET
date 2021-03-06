﻿///<reference path="../TimeSpan.ts"/>
///<reference path="../IFormatProvider.ts"/>

/*
* @author electricessence / https://github.com/electricessence/
* Based upon .NET source.
* Licensing: MIT https://github.com/electricessence/TypeScript.NET/blob/master/LICENSE
*/

import TimeSpan = System.TimeSpan;
import IFormatProvider = System.IFormatProvider;

module System.Globalization
{

	module String
	{
		export var Empty:string = "";
	}

	// http://referencesource.microsoft.com/#mscorlib/system/globalization/timespanformat.cs
	export module TimeSpanFormat
	{

		enum Pattern
		{
			None    = 0,
			Minimum = 1,
			Full    = 2,
		}

		function intToString(n: number, digits: number): string
		{
			return ParseNumbers.IntToString(n, 10, digits, '0', 0);
		}

		var PositiveInvariantFormatLiterals: FormatLiterals = TimeSpanFormat.FormatLiterals.InitInvariant(false /*isNegative*/);
		var NegativeInvariantFormatLiterals: FormatLiterals = TimeSpanFormat.FormatLiterals.InitInvariant(true  /*isNegative*/);


		export function format(value: TimeSpan, format: string, formatProvider: IFormatProvider) {
			if (format == null || format.length == 0)
				format = "c";

			// standard formats
			if (format.length == 1)
			{               
                char f = format[0];

				if (f == 'c' || f == 't' || f == 'T')
					return FormatStandard(value, true, format, Pattern.Minimum);
				if (f == 'g' || f == 'G')
				{
                    Pattern pattern;
                    DateTimeFormatInfo dtfi = DateTimeFormatInfo.GetInstance(formatProvider);

					if (value._ticks < 0)
						format = dtfi.FullTimeSpanNegativePattern;
					else
						format = dtfi.FullTimeSpanPositivePattern;
					if (f == 'g')
						pattern = Pattern.Minimum;
					else
						pattern = Pattern.Full;

					return FormatStandard(value, false, format, pattern);
				}
				throw new FormatException(Environment.GetResourceString("Format_InvalidString"));
			}

			return FormatCustomized(value, format, DateTimeFormatInfo.GetInstance(formatProvider));
        }

        //
        //  FormatStandard
        //
        //  Actions: Format the TimeSpan instance using the specified format.
        //
		function formatStandard(value: TimeSpan, isInvariant: boolean, format: string, pattern: Pattern):string {
            var sb = StringBuilderCache.Acquire();
			var clock = value.time;

			var literal: FormatLiterals;
			if (isInvariant)
			{
				if (value._ticks < 0)
					literal = NegativeInvariantFormatLiterals;
				else
					literal = PositiveInvariantFormatLiterals;
			}
			else
			{
				literal = new FormatLiterals();
				literal.Init(format, pattern == Pattern.Full);
			}
			if (fraction != 0)
			{ // truncate the partial second to the specified length
				fraction = (int)((long) fraction / (long) Math.Pow(10, DateTimeFormat.MaxSecondsFractionDigits - literal.ff));
			}

			// Pattern.Full: [-]dd.hh:mm:ss.fffffff
			// Pattern.Minimum: [-][d.]hh:mm:ss[.fffffff] 

			sb.Append(literal.start);                           // [-]
			if (pattern == Pattern.Full || day != 0)
			{          //
				sb.Append(day);                                 // [dd]
				sb.Append(literal.dayHourSep);                  // [.]
			}                                                   //
			sb.Append(IntToString(hours, literal.hh));          // hh
			sb.Append(literal.hourMinuteSep);                   // :
			sb.Append(IntToString(minutes, literal.mm));        // mm
			sb.Append(literal.minuteSecondSep);                 // :
			sb.Append(IntToString(seconds, literal.ss));        // ss
			if (!isInvariant && pattern == Pattern.Minimum)
			{
                int effectiveDigits = literal.ff;
				while (effectiveDigits > 0)
				{
					if (fraction % 10 == 0)
					{
						fraction = fraction / 10;
						effectiveDigits--;
					}
					else
					{
						break;
					}
				}
				if (effectiveDigits > 0)
				{
					sb.Append(literal.secondFractionSep);           // [.FFFFFFF]
					sb.Append((fraction).ToString(DateTimeFormat.fixedNumberFormats[effectiveDigits - 1], CultureInfo.InvariantCulture));
				}
			}
			else if (pattern == Pattern.Full || fraction != 0)
			{
				sb.Append(literal.secondFractionSep);           // [.]
				sb.Append(IntToString(fraction, literal.ff));   // [fffffff]
			}                                                   //
			sb.Append(literal.end);                             //

			return StringBuilderCache.GetStringAndRelease(sb);
		}




        //
        //  FormatCustomized
        //
        //  Actions: Format the TimeSpan instance using the specified format.
        // 
		function formatCustomized(value:TimeSpan, format:string, dtfi:DateTimeFormatInfo):string {

			console.assert(dtfi != null, "dtfi == null");
			var clock = value.time;
 
            var tmp = 0;
            var i = 0;
            var tokenLen:number;
            var result = StringBuilderCache.Acquire();

			while (i < format.length)
			{
                var ch = format[i];
                var nextChar:string;
				switch (ch)
				{
					case 'h':
						tokenLen = DateTimeFormat.ParseRepeatPattern(format, i, ch);
						if (tokenLen > 2)
							throw new FormatException(Environment.GetResourceString("Format_InvalidString"));
						DateTimeFormat.FormatDigits(result, hours, tokenLen);
						break;
					case 'm':
						tokenLen = DateTimeFormat.ParseRepeatPattern(format, i, ch);
						if (tokenLen > 2)
							throw new FormatException(Environment.GetResourceString("Format_InvalidString"));
						DateTimeFormat.FormatDigits(result, minutes, tokenLen);
						break;
					case 's':
						tokenLen = DateTimeFormat.ParseRepeatPattern(format, i, ch);
						if (tokenLen > 2)
							throw new FormatException(Environment.GetResourceString("Format_InvalidString"));
						DateTimeFormat.FormatDigits(result, seconds, tokenLen);
						break;
					case 'f':
						//
						// The fraction of a second in single-digit precision. The remaining digits are truncated. 
						//
						tokenLen = DateTimeFormat.ParseRepeatPattern(format, i, ch);
						if (tokenLen > DateTimeFormat.MaxSecondsFractionDigits)
							throw new FormatException(Environment.GetResourceString("Format_InvalidString"));

						tmp = (long) fraction;
						tmp /= (long) Math.Pow(10, DateTimeFormat.MaxSecondsFractionDigits - tokenLen);
						result.Append((tmp).ToString(DateTimeFormat.fixedNumberFormats[tokenLen - 1], CultureInfo.InvariantCulture));
						break;
					case 'F':
						//
						// Displays the most significant digit of the seconds fraction. Nothing is displayed if the digit is zero.
						//
						tokenLen = DateTimeFormat.ParseRepeatPattern(format, i, ch);
						if (tokenLen > DateTimeFormat.MaxSecondsFractionDigits)
							throw new FormatException(Environment.GetResourceString("Format_InvalidString"));

						tmp = (long) fraction;
						tmp /= (long) Math.Pow(10, DateTimeFormat.MaxSecondsFractionDigits - tokenLen);
                        int effectiveDigits = tokenLen;
						while (effectiveDigits > 0)
						{
							if (tmp % 10 == 0)
							{
								tmp = tmp / 10;
								effectiveDigits--;
							}
							else
							{
								break;
							}
						}
						if (effectiveDigits > 0)
						{
							result.Append((tmp).ToString(DateTimeFormat.fixedNumberFormats[effectiveDigits - 1], CultureInfo.InvariantCulture));
						}
						break;
					case 'd':
						//
						// tokenLen == 1 : Day as digits with no leading zero.
						// tokenLen == 2+: Day as digits with leading zero for single-digit days.
						//
						tokenLen = DateTimeFormat.ParseRepeatPattern(format, i, ch);
						if (tokenLen > 8)
							throw new FormatException(Environment.GetResourceString("Format_InvalidString"));
						DateTimeFormat.FormatDigits(result, day, tokenLen, true);
						break;
					case '\'':
					case '\"':
                        StringBuilder enquotedString = new StringBuilder();
						tokenLen = DateTimeFormat.ParseQuoteString(format, i, enquotedString);
						result.Append(enquotedString);
						break;
					case '%':
						// Optional format character.
						// For example, format string "%d" will print day 
						// Most of the cases, "%" can be ignored.
						nextChar = DateTimeFormat.ParseNextChar(format, i);
                        // nextChar will be -1 if we already reach the end of the format string.
                        // Besides, we will not allow "%%" appear in the pattern.
                        if (nextChar >= 0 && nextChar != (int)'%') {
							result.Append(TimeSpanFormat.FormatCustomized(value, ((char) nextChar).ToString(), dtfi));
							tokenLen = 2;
                        }
                        else
						{
							//
							// This means that '%' is at the end of the format string or
							// "%%" appears in the format string.
							//
							throw new FormatException(Environment.GetResourceString("Format_InvalidString"));
						}
						break;
					case '\\':
						// Escaped character.  Can be used to insert character into the format string.
						// For example, "\d" will insert the character 'd' into the string.
						//
						nextChar = DateTimeFormat.ParseNextChar(format, i);
						if (nextChar >= 0)
						{
							result.Append(((char)nextChar));
							tokenLen = 2;
						}
						else
						{
							//
							// This means that '\' is at the end of the formatting string.
							//
							throw new FormatException(Environment.GetResourceString("Format_InvalidString"));
						}
						break;
					default:
						throw new FormatException(Environment.GetResourceString("Format_InvalidString"));
				}
				i += tokenLen;
			}
			return StringBuilderCache.GetStringAndRelease(result);

		}
 
 
 
 
        class FormatLiterals
	{
			get start(): string { return this.literals[0]; }
			get dayHourSep(): string { return this.literals[1]; }
			get hourMinuteSep(): string { return this.literals[2]; }
			get minuteSecondSep(): string { return this.literals[3]; }
			get secondFractionSep(): string { return this.literals[4]; }
			get end(): string { return this.literals[5]; }
	
            appCompatLiteral:string;
            dd:number;
            hh:number;
            mm:number;
            ss:number;
            ff:number;

			private literals:string[];


			static initInvariant(isNegative: boolean): FormatLiterals {
                var x = new FormatLiterals();
				x.literals = new Array<string>(6);
				x.literals[0] = isNegative ? "-" : String.Empty;
				x.literals[1] = ".";
				x.literals[2] = ":";
				x.literals[3] = ":";
				x.literals[4] = ".";
				x.literals[5] = String.Empty;
				x.appCompatLiteral = ":."; // minuteSecondSep+secondFractionSep;       
				x.dd = 2;
				x.hh = 2;
				x.mm = 2;
				x.ss = 2;
				x.ff = DateTimeFormat.MaxSecondsFractionDigits;
				return x;
			}

			init(format: string, useInvariantFieldLengths:boolean):void {
				var _ = this, literals = _.literals = new Array<string>(6);
                for (var i = 0; i < literals.length; i++)
                    literals[i] = String.Empty;
				var dd = 0, hh = 0, mm = 0, ss = 0, ff = 0;
 
				var sb: StringBuilder = StringBuilderCache.Acquire();
                var inQuote = false;
                var quote = '\'';
                var field = 0;
 
				for (var i = 0; i < format.length; i++)
				{
					var doDefault = false;
					switch (format[i])
					{
						case '\'':
						case '\"':
							if (inQuote && (quote == format[i]))
							{
								/* we were in a quote and found a matching exit quote, so we are outside a quote now */
								console.assert(field >= 0 && field <= 5, "field >= 0 && field <= 5");
								if (field >= 0 && field <= 5)
								{
									literals[field] = sb.ToString();
									sb.length = 0;
									inQuote = false;
								}
								else
								{
									return; // how did we get here?
								}
							}
							else if (!inQuote)
							{
								/* we are at the start of a new quote block */
								quote = format[i];
								inQuote = true;
							}
							else
							{
								/* we were in a quote and saw the other type of quote character, so we are still in a quote */
							}
							break;
						case '%':
							console.assert(false, "Unexpected special token '%', Bug in DateTimeFormatInfo.FullTimeSpan[Positive|Negative]Pattern");
							doDefault = true;
							break;
                        case '\\':
							if (!inQuote)
							{
								i++; /* skip next character that is escaped by this backslash or percent sign */
								break;
							}
							doDefault = true;
							break;
                        case 'd':
							if (!inQuote)
							{
								console.assert((field == 0 && sb.length == 0) || field == 1,
									"field == 0 || field == 1, Bug in DateTimeFormatInfo.FullTimeSpan[Positive|Negative]Pattern");
								field = 1; // dayHourSep
								dd++;
							}
							break;
						case 'h':
							if (!inQuote)
							{
								console.assert((field == 1 && sb.length == 0) || field == 2,
									"field == 1 || field == 2, Bug in DateTimeFormatInfo.FullTimeSpan[Positive|Negative]Pattern");
								field = 2; // hourMinuteSep
								hh++;
							}
							break;
						case 'm':
							if (!inQuote)
							{
								console.assert((field == 2 && sb.length == 0) || field == 3,
									"field == 2 || field == 3, Bug in DateTimeFormatInfo.FullTimeSpan[Positive|Negative]Pattern");
								field = 3; // minuteSecondSep
								mm++;
							}
							break;
						case 's':
							if (!inQuote)
							{
								console.assert((field == 3 && sb.length == 0) || field == 4,
									"field == 3 || field == 4, Bug in DateTimeFormatInfo.FullTimeSpan[Positive|Negative]Pattern");
								field = 4; // secondFractionSep
								ss++;
							}
							break;
						case 'f':
						case 'F':
							if (!inQuote)
							{
								console.assert((field == 4 && sb.length == 0) || field == 5,
									"field == 4 || field == 5, Bug in DateTimeFormatInfo.FullTimeSpan[Positive|Negative]Pattern");
								field = 5; // End
								ff++;
							}
							break;
						default:
							doDefault = true;
							break;
					}
					if (doDefault)
						sb.Append(format[i]);
				}

				console.assert(field == 5);
				this.appCompatLiteral = this.minuteSecondSep + this.secondFractionSep;

				console.assert(0 < dd && dd < 3, "0 < dd && dd < 3, Bug in System.Globalization.DateTimeFormatInfo.FullTimeSpan[Positive|Negative]Pattern");
				console.assert(0 < hh && hh < 3, "0 < hh && hh < 3, Bug in System.Globalization.DateTimeFormatInfo.FullTimeSpan[Positive|Negative]Pattern");
				console.assert(0 < mm && mm < 3, "0 < mm && mm < 3, Bug in System.Globalization.DateTimeFormatInfo.FullTimeSpan[Positive|Negative]Pattern");
				console.assert(0 < ss && ss < 3, "0 < ss && ss < 3, Bug in System.Globalization.DateTimeFormatInfo.FullTimeSpan[Positive|Negative]Pattern");
				console.assert(0 < ff && ff < 8, "0 < ff && ff < 8, Bug in System.Globalization.DateTimeFormatInfo.FullTimeSpan[Positive|Negative]Pattern");

				if (useInvariantFieldLengths)
				{
					dd = 2;
					hh = 2;
					mm = 2;
					ss = 2;
					ff = DateTimeFormat.MaxSecondsFractionDigits;
				}
				else
				{
					if (dd < 1 || dd > 2) dd = 2;   // The DTFI property has a problem. let's try to make the best of the situation.
					if (hh < 1 || hh > 2) hh = 2;
					if (mm < 1 || mm > 2) mm = 2;
					if (ss < 1 || ss > 2) ss = 2;
					if (ff < 1 || ff > 7) ff = 7;
				}
				StringBuilderCache.Release(sb);

				_.dd = dd;
				_.hh = hh;
				_.mm = mm;
				_.ss = ss;
				_.ff = ff;

			}
		} //end of struct FormatLiterals
	}
}
